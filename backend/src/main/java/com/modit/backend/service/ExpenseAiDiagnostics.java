package com.modit.backend.service;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Development-only, allow-listed numeric diagnostics for expense analysis. */
@Component
class ExpenseAiDiagnostics {
    private static final Logger log = LoggerFactory.getLogger(ExpenseAiDiagnostics.class);
    private final Environment environment;

    ExpenseAiDiagnostics(Environment environment) {
        this.environment = environment;
    }

    void log(JsonNode response) {
        if (!environment.acceptsProfiles(Profiles.of("dev"))) return;

        JsonNode review = response.path("review");
        Long lineTotal = integer(review.path("computed").get("line_total"));
        Long subtotal = integer(response.get("expense_subtotal"));
        Long difference = lineTotal != null && subtotal != null ? Math.abs(lineTotal - subtotal) : null;

        log.info("Expense AI diagnostics: budget_total={}, expense_subtotal={}, balance={}, expense_items.amount={}, "
                        + "E01.line_total={}, E01.expense_subtotal={}, E01.difference={}",
                integer(response.get("budget_total")), subtotal, integer(response.get("balance")), amounts(response.path("expense_items")),
                lineTotal, subtotal, difference);
        log.info("Expense AI response shape: review_present={}, integrated_review_present={}, receipt_analysis_present={}, "
                        + "integrated_status={}, integrated_verdict={}, total_pages={}, azure_layout_pages={}, coverage={}, "
                        + "openai_vision_ok={}",
                response.hasNonNull("review"), response.hasNonNull("integrated_review"), response.hasNonNull("receipt_analysis"),
                text(response.path("integrated_review").get("status")), text(response.path("integrated_review").get("verdict")),
                integer(response.path("receipt_analysis").get("total_pages")),
                integer(response.path("receipt_analysis").get("azure_layout_pages")),
                text(response.path("receipt_analysis").get("coverage")),
                response.path("receipt_analysis").path("openai_vision_ok").isBoolean()
                        ? response.path("receipt_analysis").path("openai_vision_ok").asBoolean() : null);
    }

    private List<Long> amounts(JsonNode items) {
        List<Long> values = new ArrayList<>();
        if (items.isArray()) for (JsonNode item : items) values.add(integer(item.get("amount")));
        return values;
    }

    private Long integer(JsonNode value) {
        return value != null && value.isIntegralNumber() && value.canConvertToLong() ? value.longValue() : null;
    }

    private String text(JsonNode value) {
        return value != null && value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }
}
