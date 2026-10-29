package com.modit.backend;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.storage.provider=local", "app.storage-root=build/auth-test-uploads",
        "app.supabase.url=https://test.supabase.co"})
@AutoConfigureMockMvc
class ApplicantAuthenticationTest {
    @Autowired MockMvc mvc;

    @Test void currentApplicantComesOnlyFromJwtAppMetadata() throws Exception {
        mvc.perform(get("/api/projects/modit-2026/applicants/me")
                        .with(jwt().jwt(token -> token.subject("49d55a51-79f1-4e1d-88a8-45be74799bf8")
                                .claim("app_metadata", Map.of("applicant_id", "applicant-001")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("applicant-001"));
    }

    @Test void rejectsMissingJwtAndDifferentApplicantPath() throws Exception {
        mvc.perform(get("/api/projects/modit-2026/applicants/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/projects/modit-2026/applicants/applicant-002")
                        .with(jwt().jwt(token -> token.claim("app_metadata", Map.of("applicant_id", "applicant-001")))))
                .andExpect(status().isForbidden());
    }
}
