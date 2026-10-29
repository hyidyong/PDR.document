package com.modit.backend.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import tools.jackson.databind.ObjectMapper;

class ExpenseAiDiagnosticsTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test void acceptsOnlyTheExpectedNumericShapeInDev() throws Exception {
        var response = mapper.readTree("""
                {"budget_total":200000,"expense_subtotal":115000,"balance":85000,
                 "expense_items":[{"amount":18000},{"amount":27000},{"amount":70000},{"amount":null}],
                 "review":{"computed":{"line_total":115000}}}
                """);
        var diagnostics = new ExpenseAiDiagnostics(new MockEnvironment().withProperty("spring.profiles.active", "dev"));

        assertDoesNotThrow(() -> diagnostics.log(response));
    }

    @Test void toleratesMissingDiagnosticFieldsOutsideDev() throws Exception {
        var diagnostics = new ExpenseAiDiagnostics(new MockEnvironment());

        assertDoesNotThrow(() -> diagnostics.log(mapper.readTree("{}")));
    }
}
