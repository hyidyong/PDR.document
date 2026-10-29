package com.modit.backend.service;

import tools.jackson.databind.JsonNode;
import com.modit.backend.domain.Model.DocumentVersion;
import com.modit.backend.domain.Model.Finding;
import com.modit.backend.domain.Model.InspectionStatus;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import java.util.Set;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
@ConditionalOnProperty(name="app.ai.provider", havingValue="edge")
public class SupabaseEdgeAiAnalysisService implements AiAnalysisService {
    private static final Logger log = LoggerFactory.getLogger(SupabaseEdgeAiAnalysisService.class);
    private static final Set<String> SAFE_ERRORS = Set.of("UNAUTHORIZED", "INVALID_JSON", "INVALID_FILE_PATH",
            "NOT_A_PDF", "FILE_NOT_FOUND_OR_FORBIDDEN", "PDF_TOO_LARGE", "PDF_PAGES_EXCEEDED",
            "SERVER_CONFIG_MISSING", "AZURE_RATE_LIMIT", "AZURE_TIMEOUT", "ANALYSIS_FAILED");
    private final RestClient client;
    private final String functionName;
    private final String expectedIssuer;
    private final boolean publicKeyConfigured;
    private final ExpenseReviewEvaluator evaluator;
    private final ExpenseAiDiagnostics diagnostics;
    private final OpenAiDocumentAnalysisService openAi;

    public SupabaseEdgeAiAnalysisService(@Value("${app.supabase.url}") String url,
                                         @Value("${app.supabase.publishable-key}") String publishableKey,
                                         @Value("${app.ai.function-name:analyze-expense-hj-v2}") String functionName,
                                         ExpenseReviewEvaluator evaluator,
                                         ExpenseAiDiagnostics diagnostics,
                                         OpenAiDocumentAnalysisService openAi) {
        this.client = RestClient.builder().baseUrl(url.replaceAll("/+$", "") + "/functions/v1")
                .defaultHeader("apikey", publishableKey).build();
        this.functionName = functionName;
        this.expectedIssuer = url.replaceAll("/+$", "") + "/auth/v1";
        this.publicKeyConfigured = publishableKey != null && !publishableKey.isBlank();
        this.evaluator = evaluator;
        this.diagnostics = diagnostics;
        this.openAi = openAi;
    }

    @Override public Result analyze(DocumentVersion document) {
        if (!"receipts".equals(document.requirementId())) {
            return openAi.analyze(document);
        }
        try {
            JwtAuthenticationToken authentication = authentication();
            Instant expiresAt = authentication.getToken().getExpiresAt();
            log.info("Expense AI auth diagnostics: function={}, issuer_matches={}, token_lifetime={}, public_key_configured={}",
                    functionName, expectedIssuer.equals(authentication.getToken().getClaimAsString("iss")),
                    tokenLifetime(expiresAt, Instant.now()), publicKeyConfigured);
            if (!document.storageKey().startsWith(authentication.getToken().getSubject() + "/")) {
                log.warn("Expense AI request blocked locally: code=INVALID_FILE_PATH, function={}", functionName);
                return failure("[INVALID_FILE_PATH] Storage 경로가 로그인 사용자 UUID와 일치하지 않습니다.");
            }
            JsonNode response = client.post().uri("/{functionName}", functionName)
                    .header("Authorization", "Bearer " + authentication.getToken().getTokenValue())
                    .body(Map.of("filePath", document.storageKey()))
                    .retrieve().body(JsonNode.class);
            if (response == null || response.hasNonNull("error")) throw new IllegalStateException("AI 함수가 유효한 분석 결과를 반환하지 않았습니다.");
            diagnostics.log(response);
            return response.hasNonNull("integrated_review")
                    ? evaluator.fromIntegratedResponse(response)
                    : response.hasNonNull("review") ? evaluator.fromReview(response.path("review")) : evaluator.evaluate(response);
        } catch (RestClientResponseException e) {
            String code = errorCode(e.getResponseBodyAsString());
            String gatewayCode = diagnosticCode(e.getResponseHeaders() == null ? null : e.getResponseHeaders().getFirst("sb-error-code"));
            log.warn("Expense AI request rejected: status={}, code={}, sb_error_code={}, function={}",
                    e.getStatusCode().value(), code, gatewayCode, functionName);
            String stage = rejectionStage(gatewayCode, code);
            log.warn("Expense AI rejection evidence: stage_hint={}, function={}", stage, functionName);
            return new Result(InspectionStatus.UNVERIFIABLE,
                    List.of(new Finding("AI_ERROR", "[HTTP " + e.getStatusCode().value() + " / " + code + "] "
                            + messageFor(e.getStatusCode(), code))), "AI_ERROR",
                    Map.of("httpStatus", e.getStatusCode().value(), "errorCode", code,
                            "sbErrorCode", gatewayCode, "authStageHint", stage));
        } catch (Exception e) {
            log.warn("Expense AI request failed: function={}, reason={}", functionName, e.getClass().getSimpleName());
            return failure("실제 AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    private JwtAuthenticationToken authentication() {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken token) return token;
        throw new IllegalStateException("AI 분석에 사용자 인증 정보가 필요합니다.");
    }
    private Result failure(String message) {
        return new Result(InspectionStatus.UNVERIFIABLE, List.of(new Finding("AI_ERROR", message)), "AI_ERROR");
    }
    static String errorCode(String body) {
        if (body == null || body.length() > 65536) return "UNKNOWN";
        try {
            JsonNode value = new ObjectMapper().readTree(body);
            String code = value.path("error").asText();
            if (SAFE_ERRORS.contains(code)) return code;
            if ("Invalid JWT".equals(value.path("msg").asText())
                    || "Missing authorization header".equals(value.path("message").asText())
                    || "Invalid JWT".equals(value.path("message").asText())) return "GATEWAY_JWT_REJECTED";
        } catch (Exception ignored) { /* Never log upstream bodies or parse exception messages. */ }
        return "UNKNOWN";
    }
    static String diagnosticCode(String value) {
        return value != null && value.matches("[A-Za-z0-9_-]{1,80}") ? value : "NONE";
    }
    static String rejectionStage(String gatewayCode, String code) {
        if (!"NONE".equals(gatewayCode)) return "GATEWAY_REPORTED";
        if ("GATEWAY_JWT_REJECTED".equals(code)) return "GATEWAY_AUTH_SUSPECTED";
        if ("UNAUTHORIZED".equals(code)) return "FUNCTION_AUTH_SUSPECTED";
        return "UNDETERMINED";
    }
    static String tokenLifetime(Instant expiresAt, Instant now) {
        if (expiresAt == null) return "UNKNOWN";
        if (!expiresAt.isAfter(now)) return "EXPIRED";
        return expiresAt.isBefore(now.plusSeconds(180)) ? "EXPIRING_SOON" : "VALID_WINDOW";
    }
    private String messageFor(HttpStatusCode status, String code) {
        if ("UNAUTHORIZED".equals(code)) return "Edge Function이 사용자 JWT를 승인하지 않았습니다.";
        if ("INVALID_FILE_PATH".equals(code)) return "Storage 경로가 로그인 사용자 UUID 또는 파일 UUID 형식과 일치하지 않습니다.";
        if ("FILE_NOT_FOUND_OR_FORBIDDEN".equals(code)) return "Storage 파일이 없거나 SELECT RLS가 접근을 거부했습니다.";
        if ("PDF_TOO_LARGE".equals(code)) return "4MB를 초과한 PDF는 실제 AI 분석을 진행할 수 없습니다.";
        if ("NOT_A_PDF".equals(code)) return "Storage 객체가 정상 PDF 형식이 아닙니다.";
        if ("SERVER_CONFIG_MISSING".equals(code)) return "Edge Function의 Supabase 환경변수 설정이 누락되었습니다.";
        if ("ANALYSIS_FAILED".equals(code)) return "Azure 분석 설정 또는 모델 호출에 실패했습니다.";
        return switch (status.value()) {
            case 400 -> "AI 분석 요청 형식 또는 Storage 경로가 올바르지 않습니다.";
            case 401, 403 -> "AI 분석 인증 또는 파일 접근 권한을 확인해 주세요.";
            case 404 -> "분석할 PDF를 Storage에서 찾지 못했습니다.";
            case 413 -> "4MB를 초과한 PDF는 실제 AI 분석을 진행할 수 없습니다.";
            case 429 -> "Azure AI 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
            case 504 -> "Azure AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
            default -> "Azure AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        };
    }
}
