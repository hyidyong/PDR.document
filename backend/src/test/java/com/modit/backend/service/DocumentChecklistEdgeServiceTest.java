package com.modit.backend.service;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.modit.backend.api.ChecklistDtos.ChecklistRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

class DocumentChecklistEdgeServiceTest {
    private final DocumentChecklistEdgeService service = new DocumentChecklistEdgeService(
            "http://127.0.0.1:1", "not-a-real-key", "generate-document-checklist");

    @AfterEach void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test void rejectsEmptyPayloadBeforeAuthenticationOrNetworkAccess() {
        assertThrows(IllegalArgumentException.class,
                () -> service.generate(new ChecklistRequest(null, null, null, null, null, null)));
    }

    @Test void rejectsMissingJwtBeforeNetworkAccess() {
        var payload = new ChecklistRequest("지원사업 제출서류", null, null, null, "합성 공고문", null);
        assertThrows(ResponseStatusException.class, () -> service.generate(payload));
    }

    @Test void rejectsInstructionsOverContractLimitBeforeNetworkAccess() {
        var payload = new ChecklistRequest(null, null, null, null, "가".repeat(12_001), null);
        assertThrows(IllegalArgumentException.class, () -> service.generate(payload));
    }
}
