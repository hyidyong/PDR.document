package com.modit.backend.service;

import tools.jackson.databind.JsonNode;
import com.modit.backend.domain.Model.Finding;
import com.modit.backend.domain.Model.InspectionStatus;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Local fallback for the legacy normalized expense shape and mapper for Edge review results. */
@Component
public class ExpenseReviewEvaluator {
    private static final double MINIMUM_CONFIDENCE = 0.7;

    public AiAnalysisService.Result evaluate(JsonNode expense) {
        List<RuleFinding> findings = new ArrayList<>();
        requiredText(expense, "project_name", findings);
        requiredInteger(expense, "budget_total", findings);
        requiredInteger(expense, "expense_subtotal", findings);
        requiredInteger(expense, "balance", findings);

        JsonNode items = expense.path("expense_items");
        if (!items.isArray() || items.isEmpty()) {
            add(findings, "E03", "review", "expense_items", "지출 내역 표를 추출하지 못했습니다. 원본 확인이 필요합니다.");
        } else {
            for (int i = 0; i < items.size(); i++) validateRow(items.get(i), i, findings);
        }

        Long lineTotal = lineTotal(items);
        Long budget = integer(expense.get("budget_total"));
        Long subtotal = integer(expense.get("expense_subtotal"));
        Long balance = integer(expense.get("balance"));
        boolean amountsTrusted = rowAmountsTrusted(items);
        JsonNode confidence = expense.path("confidence");

        if (lineTotal != null && subtotal != null && !lineTotal.equals(subtotal)) {
            add(findings, "E01", correction(amountsTrusted && trusted(confidence, "expense_subtotal")), "expense_subtotal",
                    "항목별 금액 합계와 기재된 지출 소계가 " + Math.abs(lineTotal - subtotal) + "원 차이 납니다.");
        }
        if (budget != null && subtotal != null && balance != null && budget - subtotal != balance) {
            add(findings, "E02", correction(trusted(confidence, "budget_total") && trusted(confidence, "expense_subtotal") && trusted(confidence, "balance")),
                    "balance", "총예산에서 지출 소계를 뺀 금액과 기재된 잔액이 다릅니다.");
        }

        add(findings, "E05_PENDING", "review", "attachments_status",
                "현재는 지출결과서 첫 페이지만 분석했습니다. 여러 영수증의 누락 여부는 아직 판단할 수 없습니다.");

        boolean correction = findings.stream().anyMatch(f -> f.kind.equals("correction"));
        InspectionStatus status = correction ? InspectionStatus.RECOMMEND : InspectionStatus.UNVERIFIABLE;
        List<Finding> mapped = findings.stream().map(f -> new Finding(f.id, f.message)).toList();
        return new AiAnalysisService.Result(status, mapped, "AZURE_RULES_LOCAL");
    }

    public AiAnalysisService.Result fromReview(JsonNode review) {
        String verdict = review.path("verdict").asText("needs_review");
        InspectionStatus status = switch (verdict) {
            case "candidate_pass" -> InspectionStatus.PASS;
            case "needs_correction" -> InspectionStatus.RECOMMEND;
            default -> InspectionStatus.UNVERIFIABLE;
        };
        List<Finding> findings = new ArrayList<>();
        JsonNode values = review.path("findings");
        if (values.isArray()) for (JsonNode value : values) {
            findings.add(new Finding(value.path("rule_id").asText("RULE"), value.path("message").asText("검수 결과를 확인해 주세요.")));
        }
        return new AiAnalysisService.Result(status, List.copyOf(findings), "AZURE_EDGE_RULES");
    }

    public AiAnalysisService.Result fromIntegratedResponse(JsonNode response) {
        JsonNode integrated = response.path("integrated_review");
        JsonNode analysis = response.path("receipt_analysis");
        String integratedStatus = integrated.path("status").asText("unknown");
        List<Finding> findings = new ArrayList<>();
        boolean correction = false;
        JsonNode ruleValues = response.path("review").path("findings");
        // review-v1 is a first-page-oriented legacy result. integrated_review supersedes it.
        if (integrated.isMissingNode() && ruleValues.isArray()) for (JsonNode value : ruleValues) {
            String kind = value.path("kind").asText("review");
            correction |= "correction".equals(kind);
            findings.add(new Finding(
                    value.path("rule_id").asText("RULE"),
                    value.path("message").asText("규칙 검수 결과를 확인해 주세요."),
                    kind, null, null, null, scalar(value.get("expected")), scalar(value.get("actual")), "review"));
        }
        JsonNode values = integrated.path("findings");
        if (values.isArray()) for (JsonNode value : values) {
            String kind = value.path("kind").asText("review");
            correction |= "correction".equals(kind);
            findings.add(new Finding(
                    value.path("code").asText("INTEGRATED_REVIEW"),
                    value.path("message").asText("통합 검수 결과를 확인해 주세요."),
                    kind, integerValue(value.get("page")), integerValue(value.get("evidence_page")),
                    nullableText(value.get("row_no")), scalar(value.get("expected")), scalar(value.get("actual")),
                    "integrated_review:" + value.path("source").asText("unknown")));
        }
        String integratedVerdict = integrated.path("verdict").asText("needs_review");
        boolean hasReview = findings.stream().anyMatch(f -> "review".equals(f.kind()));
        Integer detectedCount = integerValue(integrated.get("detected_count"));
        boolean completed = "completed_with_human_review".equals(integratedStatus);
        InspectionStatus status = !completed
                ? InspectionStatus.UNVERIFIABLE
                : correction || "needs_correction".equals(integratedVerdict) ? InspectionStatus.RECOMMEND
                : hasReview || "needs_review".equals(integratedVerdict) ? InspectionStatus.UNVERIFIABLE
                : findings.isEmpty() && Integer.valueOf(0).equals(detectedCount)
                    && "candidate_pass".equals(integratedVerdict)
                    ? InspectionStatus.PASS : InspectionStatus.UNVERIFIABLE;

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("integratedReviewStatus", integratedStatus);
        metadata.put("integratedReviewVerdict", integratedVerdict);
        metadata.put("reviewVerdict", nullableText(response.path("review").get("verdict")));
        metadata.put("legacyReviewFindingCount", ruleValues.isArray() ? ruleValues.size() : 0);
        metadata.put("legacyReviewFindingCodes", findingCodes(ruleValues, "rule_id"));
        metadata.put("humanApprovalRequired", integrated.path("human_approval_required").asBoolean(true));
        metadata.put("detectedCount", detectedCount);
        metadata.put("allPagesVerifiedByOpenAi", integrated.path("all_pages_verified_by_openai").asBoolean(false));
        metadata.put("totalPages", integerValue(analysis.get("total_pages")));
        metadata.put("azureLayoutPages", integerValue(analysis.get("azure_layout_pages")));
        metadata.put("coverage", nullableText(analysis.get("coverage")));
        metadata.put("azureNeuralOk", analysis.path("azure_neural_ok").asBoolean(false));
        metadata.put("openAiVisionOk", analysis.path("openai_vision_ok").asBoolean(false));
        metadata.put("extractionWarnings", stringValues(response.path("warnings")));
        return new AiAnalysisService.Result(status, List.copyOf(findings), "AZURE_OPENAI_INTEGRATED",
                java.util.Collections.unmodifiableMap(metadata));
    }

    private Integer integerValue(JsonNode value) {
        return value != null && value.isIntegralNumber() && value.canConvertToInt() ? value.intValue() : null;
    }
    private String nullableText(JsonNode value) {
        return value == null || value.isNull() || value.asText().isBlank() ? null : value.asText();
    }
    private Object scalar(JsonNode value) {
        if (value == null || value.isNull()) return null;
        if (value.isIntegralNumber()) return value.longValue();
        if (value.isNumber()) return value.doubleValue();
        if (value.isBoolean()) return value.asBoolean();
        return value.asText();
    }

    private List<String> findingCodes(JsonNode values, String field) {
        List<String> codes = new ArrayList<>();
        if (values.isArray()) for (JsonNode value : values) {
            String code = value.path(field).asText();
            if (!code.isBlank()) codes.add(code);
        }
        return List.copyOf(codes);
    }

    private List<String> stringValues(JsonNode values) {
        List<String> result = new ArrayList<>();
        if (values.isArray()) for (JsonNode value : values) if (value.isTextual() && !value.asText().isBlank()) result.add(value.asText());
        return List.copyOf(result);
    }

    private void validateRow(JsonNode row, int index, List<RuleFinding> findings) {
        String root = "expense_items[" + index + "]";
        // evidence_id is a normalized/internal link, not a mandatory printed field.
        for (String field : List.of("expense_type", "date", "amount")) {
            JsonNode value = row.get(field);
            if (value == null || value.isNull() || value.asText().isBlank()) add(findings, "E03", "review", root + "." + field, (index + 1) + "행의 " + field + " 값을 확인하지 못했습니다.");
        }
        JsonNode date = row.get("date");
        if (date != null && !date.isNull()) try { LocalDate.parse(date.asText()); } catch (DateTimeParseException e) {
            add(findings, "E04", "review", root + ".date", (index + 1) + "행 날짜 형식이 올바르지 않습니다.");
        }
        Long amount = integer(row.get("amount"));
        if (row.hasNonNull("amount") && (amount == null || amount < 0)) add(findings, "E04", "review", root + ".amount", (index + 1) + "행 금액을 확인해 주세요.");
    }

    private void requiredText(JsonNode root, String field, List<RuleFinding> findings) {
        if (!root.hasNonNull(field) || root.path(field).asText().isBlank()) add(findings, "E03", "review", field, field + " 값을 추출하지 못했습니다.");
    }
    private void requiredInteger(JsonNode root, String field, List<RuleFinding> findings) {
        if (integer(root.get(field)) == null) add(findings, "E03", "review", field, field + " 금액을 확인하지 못했습니다.");
    }
    private Long lineTotal(JsonNode items) {
        if (!items.isArray() || items.isEmpty()) return null;
        long total = 0;
        for (JsonNode item : items) { Long amount = integer(item.get("amount")); if (amount == null || amount < 0) return null; total += amount; }
        return total;
    }
    private boolean rowAmountsTrusted(JsonNode items) {
        if (!items.isArray() || items.isEmpty()) return false;
        for (JsonNode item : items) if (integer(item.get("amount")) == null || !trusted(item.path("confidence"), "amount")) return false;
        return true;
    }
    private boolean trusted(JsonNode confidence, String field) { return confidence.path(field).isNumber() && confidence.path(field).asDouble() >= MINIMUM_CONFIDENCE; }
    private Long integer(JsonNode value) {
        if (value == null || !value.isIntegralNumber()) return null;
        return value.canConvertToLong() ? value.longValue() : null;
    }
    private String correction(boolean trusted) { return trusted ? "correction" : "review"; }
    private void add(List<RuleFinding> values, String id, String kind, String path, String message) {
        if (values.stream().noneMatch(value -> value.id.equals(id) && value.path.equals(path))) values.add(new RuleFinding(id, kind, path, message));
    }
    private record RuleFinding(String id, String kind, String path, String message) {}
}
