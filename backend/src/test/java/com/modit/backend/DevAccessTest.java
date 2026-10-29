package com.modit.backend;

import com.modit.backend.api.DevAccess;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class DevAccessTest {
    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    private void authenticate(String applicantId) {
        Jwt jwt = new Jwt("signed-test-token", Instant.now(), Instant.now().plusSeconds(300),
                Map.of("alg", "RS256"), Map.of("sub", "49d55a51-79f1-4e1d-88a8-45be74799bf8",
                "app_metadata", Map.of("applicant_id", applicantId)));
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    @Test void acceptsApplicantIdFromVerifiedJwtMetadata() {
        authenticate("applicant-001");
        assertDoesNotThrow(() -> new DevAccess(false).applicant("applicant-001"));
    }

    @Test void rejectsDifferentApplicantAndMissingAuthentication() {
        authenticate("applicant-001");
        assertThrows(ResponseStatusException.class, () -> new DevAccess(false).applicant("applicant-002"));
        SecurityContextHolder.clearContext();
        assertThrows(ResponseStatusException.class, () -> new DevAccess(false).applicant("applicant-001"));
    }
}
