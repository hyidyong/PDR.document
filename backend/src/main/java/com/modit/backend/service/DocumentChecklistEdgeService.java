package com.modit.backend.service;

import com.modit.backend.api.ChecklistDtos.ChecklistRequest;
import com.modit.backend.api.ChecklistDtos.ChecklistResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/** Schema-neutral bridge until the generate-document-checklist contract is finalized. */
@Service
public class DocumentChecklistEdgeService {
    private static final Logger log = LoggerFactory.getLogger(DocumentChecklistEdgeService.class);
    private final RestClient client;
    private final String functionName;

    public DocumentChecklistEdgeService(@Value("${app.supabase.url}") String url,
                                        @Value("${app.supabase.publishable-key}") String publishableKey,
                                        @Value("${app.ai.checklist-function-name:generate-document-checklist}") String functionName) {
        this.client = RestClient.builder().baseUrl(url.replaceAll("/+$", "") + "/functions/v1")
                .defaultHeader("apikey", publishableKey).build();
        this.functionName = functionName;
    }

    public ChecklistResponse generate(ChecklistRequest payload) {
        validate(payload);
        JwtAuthenticationToken authentication = authentication();
        try {
            ChecklistResponse response = client.post().uri("/{functionName}", functionName)
                    .header("Authorization", "Bearer " + authentication.getToken().getTokenValue())
                    .body(payload).retrieve().body(ChecklistResponse.class);
            if (response == null) throw new ResponseStatusException(HttpStatusCode.valueOf(502), "체크리스트 함수가 빈 응답을 반환했습니다.");
            validate(response);
            return response;
        } catch (RestClientResponseException e) {
            String gatewayCode = SupabaseEdgeAiAnalysisService.diagnosticCode(
                    e.getResponseHeaders() == null ? null : e.getResponseHeaders().getFirst("sb-error-code"));
            log.warn("Checklist Edge request rejected: status={}, sb_error_code={}, function={}",
                    e.getStatusCode().value(), gatewayCode, functionName);
            throw new ResponseStatusException(e.getStatusCode(), "체크리스트 생성 요청이 거부되었습니다.");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Checklist Edge request failed: function={}, reason={}", functionName, e.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatusCode.valueOf(502), "체크리스트 생성 결과를 확인하지 못했습니다.");
        }
    }

    private void validate(ChecklistRequest request) {
        if (request == null || (blank(request.programName()) && blank(request.officialInstructions()))) {
            throw new IllegalArgumentException("사업명 또는 공고문 안내 텍스트가 필요합니다.");
        }
        if (request.officialInstructions() != null && request.officialInstructions().length() > 12_000) {
            throw new IllegalArgumentException("공고문 안내 텍스트는 12,000자 이하여야 합니다.");
        }
    }

    private void validate(ChecklistResponse response) {
        if (!"2.0".equals(response.schema_version()) || response.items() == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(502), "체크리스트 함수 응답 형식이 올바르지 않습니다.");
        }
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }

    private JwtAuthenticationToken authentication() {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken token) return token;
        throw new ResponseStatusException(HttpStatusCode.valueOf(401), "로그인이 필요합니다.");
    }
}
