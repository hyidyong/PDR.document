package com.modit.backend.api;

import java.util.List;

public final class ChecklistDtos {
    private ChecklistDtos() {}

    public record ChecklistRequest(String documentType, String programName, String institution, String deadline,
                                   String officialInstructions, String userContext) {}

    public record ChecklistItem(String title, String requirement, String issuer, String howToObtain,
                                String estimatedTime, String deadline, String filenameRule, String sourceUrl,
                                String sourceType, String verification, String evidence, String notes) {}

    public record ChecklistResponse(String schema_version, String programName, String documentType, String deadline,
                                    String filenameRule, List<ChecklistItem> items, List<String> questions,
                                    boolean webSearchUsed, String sourceVerification, String disclaimer) {}
}
