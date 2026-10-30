package com.modit.backend.service;

import com.modit.backend.api.ChecklistDtos.ChecklistRequest;
import com.modit.backend.api.ChecklistDtos.ChecklistResponse;
import java.util.Set;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Schema-neutral bridge until the generate-document-checklist contract is finalized. */
@Service
public class DocumentChecklistEdgeService {
    private static final Logger log = LoggerFactory.getLogger(DocumentChecklistEdgeService.class);
    private static final ObjectMapper mapper = new ObjectMapper();
    private static final Set<String> SAFE_EDGE_ERRORS = Set.of("OPENAI_INSUFFICIENT_QUOTA", "OPENAI_RATE_LIMIT",
            "OPENAI_AUTH_FAILED", "OPENAI_ACCESS_DENIED", "OPENAI_API_FAILED", "OPENAI_API_KEY_NOT_CONFIGURED");
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
            String edgeCode = safeEdgeErrorCode(e.getResponseBodyAsString());
            log.warn("Checklist Edge request rejected: status={}, edge_error_code={}, sb_error_code={}, function={}",
                    e.getStatusCode().value(), edgeCode, gatewayCode, functionName);
            throw new ResponseStatusException(e.getStatusCode(), rejectionMessage(e.getStatusCode(), edgeCode));
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

    static String safeEdgeErrorCode(String body) {
        if (body == null || body.length() > 2048) return "UNKNOWN";
        try {
            JsonNode json = mapper.readTree(body);
            String code = json.path("error").asText();
            return SAFE_EDGE_ERRORS.contains(code) ? code : "UNKNOWN";
        } catch (Exception ignored) {
            return "UNKNOWN";
        }
    }

    static String rejectionMessage(HttpStatusCode status, String edgeCode) {
        return switch (edgeCode) {
            case "OPENAI_INSUFFICIENT_QUOTA" -> "OpenAI API 할당량이 부족합니다. 관리자에게 서비스 설정 확인을 요청해 주세요.";
            case "OPENAI_RATE_LIMIT" -> "OpenAI API 요청 속도 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.";
            case "OPENAI_AUTH_FAILED", "OPENAI_ACCESS_DENIED", "OPENAI_API_KEY_NOT_CONFIGURED" ->
                    "체크리스트 AI 서비스 인증 설정에 문제가 있습니다. 관리자에게 확인을 요청해 주세요.";
            default -> switch (status.value()) {
                case 401 -> "체크리스트 생성 서비스 인증에 실패했습니다. 다시 로그인한 뒤 시도해 주세요.";
                case 403 -> "체크리스트 생성 서비스에 접근할 권한이 없습니다.";
                case 429 -> "체크리스트 AI 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
                default -> "체크리스트 생성 요청이 거부되었습니다.";
            };
        };
    }

    private JwtAuthenticationToken authentication() {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken token) return token;
        throw new ResponseStatusException(HttpStatusCode.valueOf(401), "로그인이 필요합니다.");
    }
}
