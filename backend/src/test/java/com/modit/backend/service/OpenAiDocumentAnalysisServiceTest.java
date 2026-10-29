package com.modit.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.modit.backend.domain.Model.DocumentVersion;
import com.modit.backend.domain.Model.InspectionStatus;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class OpenAiDocumentAnalysisServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final FileStorage storage = new FileStorage() {
        @Override public String save(String projectId, String applicantId, MultipartFile file) { return "unused"; }
        @Override public Resource read(String key) { return new ByteArrayResource("%PDF-1.4\ntest".getBytes()); }
    };

    @Test void mapsBusinessPlanRevisionAndKeepsBRuleIds() throws Exception {
        var service = service(review("business_plan", "B", "B02", "fail", "revision"));

        var result = service.analyze(document("plan"));

        assertEquals(InspectionStatus.RECOMMEND, result.status());
        assertEquals("OPENAI_RULES", result.source());
        assertEquals("B02", result.findings().getFirst().id());
    }

    @Test void mapsPassingContractWithoutFindings() throws Exception {
        var service = service(review("goods_purchase_contract", "C", null, "pass", "review"));

        var result = service.analyze(document("contract"));

        assertEquals(InspectionStatus.PASS, result.status());
        assertEquals(0, result.findings().size());
    }

    @Test void optionalB05AdviceIsVisibleWithoutBlockingPass() throws Exception {
        var result = service(review("business_plan", "B", "B05", "advisory", "review"))
                .analyze(document("plan"));
        assertEquals(InspectionStatus.PASS, result.status());
        assertEquals("B05", result.findings().getFirst().id());
        assertEquals("info", result.findings().getFirst().kind());
    }

    @Test void realB05UncertaintyAndB04ContradictionStillNeedReview() throws Exception {
        for (String id : Set.of("B04", "B05")) {
            var result = service(review("business_plan", "B", id, "needs_review", "review"))
                    .analyze(document("plan"));
            assertEquals(InspectionStatus.UNVERIFIABLE, result.status());
            assertEquals(id, result.findings().getFirst().id());
        }
    }

    @Test void arithmeticFailureStillBlocksPassAlongsideOptionalAdvice() throws Exception {
        var response = review("business_plan", "B", "B02", "fail", "revision");
        ((tools.jackson.databind.node.ObjectNode) response.path("findings").get(4)).put("status", "advisory");
        assertEquals(InspectionStatus.RECOMMEND, service(response).analyze(document("plan")).status());
    }

    @Test void adviceCannotHideOtherRulesOrContractFailures() throws Exception {
        for (String id : Set.of("B01", "B04")) {
            var result = service(review("business_plan", "B", id, "advisory", "review")).analyze(document("plan"));
            assertEquals("OPENAI_INVALID_RESULT", result.findings().getFirst().id());
        }
        var result = service(review("goods_purchase_contract", "C", "C05", "advisory", "review"))
                .analyze(document("contract"));
        assertEquals("OPENAI_INVALID_RESULT", result.findings().getFirst().id());
    }

    @Test void businessRuleCannotBeAcceptedForContractRequirement() throws Exception {
        var result = service(review("business_plan", "B", "B05", "needs_review", "review"))
                .analyze(document("contract"));
        assertEquals("OPENAI_INVALID_RESULT", result.findings().getFirst().id());
    }

    @Test void rejectsIncompleteRuleOutputInsteadOfPretendingItPassed() throws Exception {
        JsonNode incomplete = mapper.readTree("""
                {"document_type":"business_plan","overall_status":"pass","note":"AI 사전검수",
                 "findings":[{"rule_id":"B01","status":"pass","severity":"revision","field":"","message":"","evidence":"","location":"","suggestion":""}]}
                """);
        var service = service(incomplete);

        var result = service.analyze(document("plan"));

        assertEquals(InspectionStatus.UNVERIFIABLE, result.status());
        assertEquals("OPENAI_INVALID_RESULT", result.findings().getFirst().id());
    }

    @Test void rejectsUnknownAndCrossDocumentRuleIds() throws Exception {
        JsonNode unknown = review("business_plan", "B", null, "pass", "review");
        ((tools.jackson.databind.node.ObjectNode) unknown.path("findings").get(0)).put("rule_id", "C01");

        var result = service(unknown).analyze(document("plan"));

        assertEquals(InspectionStatus.UNVERIFIABLE, result.status());
        assertEquals("OPENAI_INVALID_RESULT", result.findings().getFirst().id());
    }

    @Test void rejectsDuplicateRuleIdsEvenWhenArrayContainsSixFindings() throws Exception {
        JsonNode duplicate = review("goods_purchase_contract", "C", null, "pass", "review");
        ((tools.jackson.databind.node.ObjectNode) duplicate.path("findings").get(5)).put("rule_id", "C01");

        var result = service(duplicate).analyze(document("contract"));

        assertEquals(InspectionStatus.UNVERIFIABLE, result.status());
        assertEquals("OPENAI_INVALID_RESULT", result.findings().getFirst().id());
    }

    @Test void structuredOutputSchemaRestrictsRuleIdsToTheCurrentDocument() {
        var parser = new OpenAiDocumentAnalysisService.HttpResponsesClient("unused", "gpt-4.1-mini", mapper);
        JsonNode schema = mapper.valueToTree(parser.outputSchema("business_plan",
                Set.of("B01", "B02", "B03", "B04", "B05", "B06")));

        JsonNode findings = schema.path("properties").path("findings");
        JsonNode ids = findings.path("items").path("properties").path("rule_id").path("enum");
        assertEquals(6, ids.size());
        var actual = new java.util.HashSet<String>();
        ids.forEach(id -> actual.add(id.asText()));
        assertTrue(actual.containsAll(Set.of("B01", "B02", "B03", "B04", "B05", "B06")));
    }

    @Test void ruleFileContainsExactlyTheExpectedBusinessAndContractIds() throws Exception {
        JsonNode templates;
        try (var input = getClass().getClassLoader().getResourceAsStream("modit-openai/review_rules.json")) {
            templates = mapper.readTree(input).path("templates");
        }

        assertEquals(Set.of("B01", "B02", "B03", "B04", "B05", "B06"), ids(templates.path("business_plan")));
        assertEquals(Set.of("C01", "C02", "C03", "C04", "C05", "C06"), ids(templates.path("goods_purchase_contract")));
    }

    @Test void parsesStructuredOutputOnlyWhenResponseIsCompleted() throws Exception {
        JsonNode review = review("business_plan", "B", null, "pass", "review");
        var parser = new OpenAiDocumentAnalysisService.HttpResponsesClient("unused", "gpt-4.1-mini", mapper);
        var response = response("completed", "output_text", mapper.writeValueAsString(review));

        assertEquals("business_plan", parser.parseResponse(response).path("document_type").asText());
    }

    @Test void rejectsIncompleteFailedAndInProgressResponsesEvenWithValidOutputText() throws Exception {
        JsonNode review = review("business_plan", "B", null, "pass", "review");
        String text = mapper.writeValueAsString(review);
        var parser = new OpenAiDocumentAnalysisService.HttpResponsesClient("unused", "gpt-4.1-mini", mapper);

        for (String status : new String[] {"incomplete", "failed", "in_progress", "cancelled", "queued"}) {
            assertThrows(IllegalStateException.class, () -> parser.parseResponse(response(status, "output_text", text)));
        }
    }

    @Test void rejectsRefusalEvenWhenTopLevelResponseIsCompleted() throws Exception {
        var parser = new OpenAiDocumentAnalysisService.HttpResponsesClient("unused", "gpt-4.1-mini", mapper);

        assertThrows(IllegalStateException.class,
                () -> parser.parseResponse(response("completed", "refusal", "Document review refused")));
    }

    @Test void rejectsRefusalEvenWhenOutputTextAppearsFirst() throws Exception {
        JsonNode review = review("business_plan", "B", null, "pass", "review");
        var response = response("completed", "output_text", mapper.writeValueAsString(review));
        ((tools.jackson.databind.node.ArrayNode) response.path("output").get(0).path("content"))
                .addObject().put("type", "refusal").put("refusal", "Document review refused");
        var parser = new OpenAiDocumentAnalysisService.HttpResponsesClient("unused", "gpt-4.1-mini", mapper);

        assertThrows(IllegalStateException.class, () -> parser.parseResponse(response));
    }

    private OpenAiDocumentAnalysisService service(JsonNode response) throws Exception {
        JsonNode templates;
        try (var input = getClass().getClassLoader().getResourceAsStream("modit-openai/review_rules.json")) {
            templates = mapper.readTree(input).path("templates");
        }
        return new OpenAiDocumentAnalysisService(storage, mapper, (filename, pdf, type, rules) -> response, templates);
    }

    private JsonNode review(String documentType, String prefix, String issueId, String issueStatus, String issueSeverity) throws Exception {
        var root = mapper.createObjectNode();
        root.put("document_type", documentType);
        root.put("overall_status", issueId == null ? "pass" : "revision");
        root.put("note", "AI 사전검수이며 담당자 최종 승인 필요");
        var findings = root.putArray("findings");
        for (int i = 1; i <= 6; i++) {
            String id = prefix + "0" + i;
            var finding = findings.addObject();
            finding.put("rule_id", id);
            finding.put("status", id.equals(issueId) ? issueStatus : "pass");
            finding.put("severity", id.equals(issueId) ? issueSeverity : "review");
            finding.put("field", "검수 항목");
            finding.put("message", id.equals(issueId) ? "수정이 필요합니다." : "확인됨");
            finding.put("evidence", "근거");
            finding.put("location", "1쪽");
            finding.put("suggestion", "수정 권고");
        }
        return root;
    }

    private JsonNode response(String status, String contentType, String value) {
        var root = mapper.createObjectNode();
        root.put("status", status);
        var content = root.putArray("output").addObject().putArray("content").addObject();
        content.put("type", contentType);
        content.put("output_text".equals(contentType) ? "text" : "refusal", value);
        return root;
    }

    private DocumentVersion document(String requirementId) {
        return new DocumentVersion("doc", requirementId, 1, requirementId + ".pdf", "application/pdf", 14, "key", Instant.now());
    }

    private Set<String> ids(JsonNode template) {
        var ids = new java.util.HashSet<String>();
        template.path("checks").forEach(check -> ids.add(check.path("id").asText()));
        return ids;
    }
}
