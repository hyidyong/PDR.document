package com.modit.backend.service;

import tools.jackson.databind.ObjectMapper;
import com.modit.backend.domain.Model.InspectionStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ExpenseReviewEvaluatorTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final ExpenseReviewEvaluator evaluator = new ExpenseReviewEvaluator();

    @Test void detectsSubtotalAndLineBalanceMismatchWithoutPretendingAttachmentsWereChecked() throws Exception {
        var expense = mapper.readTree("""
                {"project_name":"demo","budget_total":300000,"expense_subtotal":168500,"balance":131500,
                 "expense_items":[
                   {"expense_type":"문구비","date":"2026-10-18","description":"a","evidence_id":"R01","amount":80000,"confidence":{"amount":0.98}},
                   {"expense_type":"문구비","date":"2026-10-18","description":"b","evidence_id":"R02","amount":80000,"confidence":{"amount":0.98}}],
                 "confidence":{"project_name":0.9,"budget_total":0.9,"expense_subtotal":0.9,"balance":0.9}}
                """);
        var result = evaluator.evaluate(expense);
        assertEquals(InspectionStatus.RECOMMEND, result.status());
        assertTrue(result.findings().stream().anyMatch(f -> f.id().equals("E01")));
        assertFalse(result.findings().stream().anyMatch(f -> f.id().equals("E02_ROWS")));
        assertTrue(result.findings().stream().anyMatch(f -> f.id().equals("E05_PENDING")));
        assertEquals("AZURE_RULES_LOCAL", result.source());
    }

    @Test void mapsEdgeReviewWhenFunctionAlreadyIncludesRules() throws Exception {
        var review = mapper.readTree("""
                {"verdict":"needs_review","findings":[{"rule_id":"E10","message":"신뢰도가 낮습니다."}]}
                """);
        var result = evaluator.fromReview(review);
        assertEquals(InspectionStatus.UNVERIFIABLE, result.status());
        assertEquals("E10", result.findings().getFirst().id());
        assertEquals("AZURE_EDGE_RULES", result.source());
    }

    @Test void successAndFailurePdfAmountsRegressWithoutConfidenceNoiseOrDuplicateCauses() throws Exception {
        var success = mapper.readTree("""
                {"project_name":"디지털 역량 강화 시범사업","budget_total":300000,"expense_subtotal":100200,"balance":199800,
                 "expense_items":[
                   {"expense_type":"회의비(식비)","date":"2026-10-10","amount":22000,"confidence":{"amount":0.41}},
                   {"expense_type":"임차비","date":"2026-10-11","amount":35000,"confidence":{"amount":0.42}},
                   {"expense_type":"교통비","date":"2026-10-12","amount":43200,"confidence":{"amount":0.43}}],
                 "confidence":{"expense_items":0.31,"budget_total":0.9,"expense_subtotal":0.9,"balance":0.9}}
                """);
        var failure = mapper.readTree("""
                {"project_name":"디지털 역량 강화 시범사업","budget_total":300000,"expense_subtotal":110200,"balance":189800,
                 "expense_items":[
                   {"expense_type":"회의비(식비)","date":"2026-10-10","amount":22000,"confidence":{"amount":0.41}},
                   {"expense_type":"임차비","date":"2026-10-11","amount":35000,"confidence":{"amount":0.42}},
                   {"expense_type":"교통비","date":"2026-10-12","amount":43200,"confidence":{"amount":0.43}}],
                 "confidence":{"expense_items":0.31,"budget_total":0.9,"expense_subtotal":0.9,"balance":0.9}}
                """);

        var passed = evaluator.evaluate(success);
        assertFalse(passed.findings().stream().anyMatch(f -> f.id().startsWith("E10") || f.id().equals("E01") || f.id().equals("E02") || f.message().contains("evidence_id")));

        var failed = evaluator.evaluate(failure);
        assertEquals(1, failed.findings().stream().filter(f -> f.id().equals("E01") || f.id().equals("E02") || f.id().equals("E02_ROWS")).count());
        assertTrue(failed.findings().stream().anyMatch(f -> f.id().equals("E01")));
        assertFalse(failed.findings().stream().anyMatch(f -> f.id().startsWith("E10") || f.id().equals("E02_ROWS") || f.message().contains("evidence_id")));
    }

    @Test void missingEvidenceIdAloneIsNotARequiredDocumentField() throws Exception {
        var expense = mapper.readTree("""
                {"project_name":"demo","budget_total":100000,"expense_subtotal":40000,"balance":60000,
                 "expense_items":[{"expense_type":"재료비","date":"2026-10-18","amount":40000,
                   "evidence_id":null,"confidence":{"amount":0.98}}],
                 "confidence":{"project_name":0.9,"budget_total":0.9,"expense_subtotal":0.9,"balance":0.9}}
                """);

        var result = evaluator.evaluate(expense);

        assertFalse(result.findings().stream().anyMatch(f -> f.id().equals("E03")));
        assertTrue(result.findings().stream().anyMatch(f -> f.id().equals("E05_PENDING")));
    }
}
