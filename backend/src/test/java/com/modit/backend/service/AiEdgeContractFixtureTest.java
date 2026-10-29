package com.modit.backend.service;

import static org.junit.jupiter.api.Assertions.*;

import com.modit.backend.api.ChecklistDtos.ChecklistResponse;
import com.modit.backend.domain.Model.InspectionStatus;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

/** Contract samples are reduced only to fields used by MODIT, preserving the supplied field names and types. */
class AiEdgeContractFixtureTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test void mapsSuppliedIntegratedExpenseSuccessShapeAndPreservesCoverage() throws Exception {
        var fixture = mapper.readTree("""
            {"warnings":["expense_items: low table confidence"],
             "review":{"verdict":"needs_review","findings":[{"rule_id":"E01","kind":"review","message":"기존 규칙"}]},
             "integrated_review":{"status":"completed_with_human_review","human_approval_required":true,
               "detected_count":5,"all_pages_verified_by_openai":true,
               "findings":[{"code":"RECEIPT_AMOUNT_MISMATCH","kind":"review","row_no":"1","page":1,
                 "evidence_page":4,"message":"금액 불일치","expected":"34000","actual":"30000","source":"openai_visual"}]},
             "receipt_analysis":{"total_pages":10,"azure_layout_pages":10,"coverage":"azure_all_pages",
               "azure_neural_ok":true,"openai_vision_ok":true}}
            """);

        var result = new ExpenseReviewEvaluator().fromIntegratedResponse(fixture);

        assertEquals(InspectionStatus.UNVERIFIABLE, result.status());
        assertFalse(result.findings().stream().anyMatch(f -> f.id().equals("E01")));
        var integrated = result.findings().stream().filter(f -> f.id().equals("RECEIPT_AMOUNT_MISMATCH")).findFirst().orElseThrow();
        assertEquals("review", integrated.kind());
        assertEquals(4, integrated.evidencePage());
        assertEquals("integrated_review:openai_visual", integrated.source());
        assertEquals(10, result.metadata().get("totalPages"));
        assertEquals("azure_all_pages", result.metadata().get("coverage"));
        assertEquals(1, result.metadata().get("legacyReviewFindingCount"));
        assertEquals(java.util.List.of("E01"), result.metadata().get("legacyReviewFindingCodes"));
        assertEquals(java.util.List.of("expense_items: low table confidence"), result.metadata().get("extractionWarnings"));
    }

    @Test void integratedCandidatePassIsNotOverriddenByLegacyWarningsOrHumanApprovalFlag() throws Exception {
        var fixture = mapper.readTree("""
            {"review":{"verdict":"needs_review","findings":[
                {"rule_id":"E03","kind":"review","field_path":"expense_items[0].evidence_id","message":"legacy"},
                {"rule_id":"E10","kind":"review","field_path":"expense_items[0].amount","message":"legacy"},
                {"rule_id":"E05_PENDING","kind":"review","field_path":"attachments_status","message":"legacy"}]},
             "integrated_review":{"status":"completed_with_human_review","verdict":"candidate_pass",
                "human_approval_required":true,"detected_count":0,"all_pages_verified_by_openai":true,"findings":[]},
             "receipt_analysis":{"total_pages":5,"azure_layout_pages":5,"coverage":"azure_all_pages",
                "openai_vision_ok":true,"missing_receipt_detection":true,"automatic_matching":true}}
            """);

        var result = new ExpenseReviewEvaluator().fromIntegratedResponse(fixture);

        assertEquals(InspectionStatus.PASS, result.status());
        assertTrue(result.findings().isEmpty());
        assertEquals(3, result.metadata().get("legacyReviewFindingCount"));
        assertEquals(5, result.metadata().get("totalPages"));
        assertEquals(5, result.metadata().get("azureLayoutPages"));
    }

    @Test void missingEvidenceIdsRemainOptionalInAzureOnlyIntegratedResult() throws Exception {
        var fixture = mapper.readTree("""
            {"expense_items":[
               {"no":"1","amount":22000,"evidence_id":null},
               {"no":"2","amount":35000,"evidence_id":null},
               {"no":"3","amount":43200,"evidence_id":null}],
             "review":{"verdict":"candidate_pass","findings":[]},
             "integrated_review":{"status":"completed_with_human_review","verdict":"candidate_pass",
                "human_approval_required":true,"detected_count":0,"findings":[]},
             "receipt_analysis":{"total_pages":5,"azure_layout_pages":5,"coverage":"azure_all_pages",
                "azure_neural_ok":true,"openai_vision_ok":false}}
            """);

        var result = new ExpenseReviewEvaluator().fromIntegratedResponse(fixture);

        assertEquals(InspectionStatus.PASS, result.status());
        assertTrue(result.findings().isEmpty());
    }

    @Test void integratedFailurePreservesEveryActualFindingAndDoesNotUseLegacyCount() throws Exception {
        var fixture = mapper.readTree("""
            {"review":{"verdict":"needs_review","findings":[{"rule_id":"E05_PENDING","kind":"review","message":"legacy"}]},
             "integrated_review":{"status":"completed_with_human_review","verdict":"needs_review",
                "human_approval_required":true,"detected_count":2,"all_pages_verified_by_openai":true,
                "findings":[
                  {"code":"SUBTOTAL_MISMATCH","kind":"review","page":1,"message":"소계 불일치","source":"azure_and_openai"},
                  {"code":"RECEIPT_AMOUNT_MISMATCH","kind":"review","row_no":"2","page":1,"evidence_page":3,
                   "message":"증빙 금액 불일치","source":"openai_visual"}]},
             "receipt_analysis":{"total_pages":5,"azure_layout_pages":5,"coverage":"azure_all_pages","openai_vision_ok":true}}
            """);

        var result = new ExpenseReviewEvaluator().fromIntegratedResponse(fixture);

        assertEquals(InspectionStatus.UNVERIFIABLE, result.status());
        assertEquals(2, result.findings().size());
        assertEquals(java.util.Set.of("SUBTOTAL_MISMATCH", "RECEIPT_AMOUNT_MISMATCH"),
                result.findings().stream().map(f -> f.id()).collect(java.util.stream.Collectors.toSet()));
        assertEquals(1, result.metadata().get("legacyReviewFindingCount"));
    }

    @Test void partialStatusIsNotAddedAsADocumentFinding() throws Exception {
        var fixture = mapper.readTree("""
            {"integrated_review":{"status":"partial_openai_unavailable","human_approval_required":true,"findings":[]},
             "receipt_analysis":{"total_pages":10,"azure_layout_pages":10,"coverage":"azure_all_pages",
               "azure_neural_ok":true,"openai_vision_ok":false}}
            """);

        var result = new ExpenseReviewEvaluator().fromIntegratedResponse(fixture);

        assertEquals(InspectionStatus.UNVERIFIABLE, result.status());
        assertTrue(result.findings().isEmpty());
    }

    @Test void azureOnlyCompletedResponseCanPassWithoutHidingActualFailures() throws Exception {
        var success = mapper.readTree("""
            {"integrated_review":{"status":"completed_with_human_review","verdict":"candidate_pass",
               "detected_count":0,"findings":[]},
             "receipt_analysis":{"coverage":"azure_all_pages","azure_neural_ok":true,"openai_vision_ok":false}}
            """);
        var failure = mapper.readTree("""
            {"integrated_review":{"status":"completed_with_human_review","verdict":"needs_correction",
               "detected_count":1,"findings":[{"code":"E02","kind":"correction","page":1,
                 "message":"총예산과 잔액 계산이 다릅니다.","source":"azure_expense"}]},
             "receipt_analysis":{"coverage":"azure_all_pages","azure_neural_ok":true,"openai_vision_ok":false}}
            """);

        var evaluator = new ExpenseReviewEvaluator();
        assertEquals(InspectionStatus.PASS, evaluator.fromIntegratedResponse(success).status());
        var failed = evaluator.fromIntegratedResponse(failure);
        assertEquals(InspectionStatus.RECOMMEND, failed.status());
        assertEquals(java.util.List.of("E02"), failed.findings().stream().map(f -> f.id()).toList());
    }

    @Test void candidatePassRequiresCompletedStatusAndZeroDetectedCount() throws Exception {
        for (String integrated : java.util.List.of(
                "{\"status\":\"failed\",\"verdict\":\"candidate_pass\",\"detected_count\":0,\"findings\":[]}",
                "{\"status\":\"completed_with_human_review\",\"verdict\":\"candidate_pass\",\"detected_count\":1,\"findings\":[]}",
                "{\"status\":\"completed_with_human_review\",\"detected_count\":0,\"findings\":[]}")) {
            var response = mapper.readTree("{\"integrated_review\":" + integrated + ",\"receipt_analysis\":{}}");
            assertEquals(InspectionStatus.UNVERIFIABLE,
                    new ExpenseReviewEvaluator().fromIntegratedResponse(response).status());
        }
    }

    @Test void deserializesSuppliedChecklistSuccessAndErrorShapes() throws Exception {
        String success = """
            {"schema_version":"2.0","programName":"MODIT 모의 지원사업","documentType":"지원사업 제출서류",
             "deadline":"2026-11-15","filenameRule":"성명_서류명.pdf",
             "items":[{"title":"주민등록등본","requirement":"필수","issuer":"정부24 또는 주민센터",
               "howToObtain":"정부24 등 공식 안내에서 발급 절차 확인","estimatedTime":null,"deadline":"2026-11-15",
               "filenameRule":"성명_주민등록등본.pdf","sourceUrl":"https://www.gov.kr/",
               "sourceType":"발급기관 공식 웹사이트","verification":"공식 웹 확인","evidence":"제출서류","notes":"예시"}],
             "questions":[],"webSearchUsed":true,"sourceVerification":"AI_ASSISTED_NOT_INDEPENDENTLY_VERIFIED",
             "disclaimer":"담당자 확인 필요"}
            """;
        ChecklistResponse response = mapper.readValue(success, ChecklistResponse.class);
        var error = mapper.readTree("{\"error\":\"OPENAI_RATE_LIMIT\",\"upstreamStatus\":429}");

        assertTrue(response.webSearchUsed());
        assertEquals("정부24 또는 주민센터", response.items().getFirst().issuer());
        assertEquals("https://www.gov.kr/", response.items().getFirst().sourceUrl());
        assertEquals("OPENAI_RATE_LIMIT", error.path("error").asText());
        assertEquals(429, error.path("upstreamStatus").asInt());
    }
}
