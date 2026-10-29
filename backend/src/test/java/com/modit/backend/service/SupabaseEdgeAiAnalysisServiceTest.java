package com.modit.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.Instant;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import com.sun.net.httpserver.HttpServer;
import com.modit.backend.domain.Model.DocumentVersion;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import org.junit.jupiter.api.Test;

class SupabaseEdgeAiAnalysisServiceTest {
    @Test void distinguishesKnownGatewayBodyFromFunctionErrorWithoutLoggingBodies() {
        assertEquals("UNAUTHORIZED", SupabaseEdgeAiAnalysisService.errorCode("{\"error\":\"UNAUTHORIZED\"}"));
        assertEquals("GATEWAY_JWT_REJECTED", SupabaseEdgeAiAnalysisService.errorCode("{\"code\":401,\"message\":\"Invalid JWT\"}"));
        assertEquals("GATEWAY_AUTH_SUSPECTED", SupabaseEdgeAiAnalysisService.rejectionStage("NONE", "GATEWAY_JWT_REJECTED"));
        assertEquals("UNKNOWN", SupabaseEdgeAiAnalysisService.errorCode("{\"error\":\"SYNTHETIC_SECRET\"}"));
        assertEquals("UNKNOWN", SupabaseEdgeAiAnalysisService.errorCode("not-json"));
    }
    @Test void separatesGatewayEvidenceFromFunctionHintAndUnknownRejections() {
        assertEquals("GATEWAY_REPORTED", SupabaseEdgeAiAnalysisService.rejectionStage("INVALID_JWT", "UNAUTHORIZED"));
        assertEquals("FUNCTION_AUTH_SUSPECTED", SupabaseEdgeAiAnalysisService.rejectionStage("NONE", "UNAUTHORIZED"));
        assertEquals("UNDETERMINED", SupabaseEdgeAiAnalysisService.rejectionStage("NONE", "UNKNOWN"));
    }

    @Test void classifiesExpiryWithoutExposingTokenClaims() {
        Instant now = Instant.parse("2026-10-30T00:00:00Z");
        assertEquals("UNKNOWN", SupabaseEdgeAiAnalysisService.tokenLifetime(null, now));
        assertEquals("EXPIRED", SupabaseEdgeAiAnalysisService.tokenLifetime(now, now));
        assertEquals("EXPIRING_SOON", SupabaseEdgeAiAnalysisService.tokenLifetime(now.plusSeconds(60), now));
        assertEquals("VALID_WINDOW", SupabaseEdgeAiAnalysisService.tokenLifetime(now.plusSeconds(600), now));
    }

    @Test void forwardsUserBearerAndPublishableKeyAndPreserves401Diagnostics() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicBoolean headersCorrect = new AtomicBoolean();
        server.createContext("/functions/v1/analyze-expense-hj-v2", exchange -> {
            headersCorrect.set("Bearer synthetic-test-token".equals(exchange.getRequestHeaders().getFirst("Authorization"))
                    && "synthetic-public-key".equals(exchange.getRequestHeaders().getFirst("apikey")));
            byte[] body = "{\"error\":\"UNAUTHORIZED\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(401, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            String url = "http://127.0.0.1:" + server.getAddress().getPort();
            Jwt jwt = Jwt.withTokenValue("synthetic-test-token").header("alg", "ES256").subject("test-user")
                    .issuer(url + "/auth/v1").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(600)).build();
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
            var service = new SupabaseEdgeAiAnalysisService(url, "synthetic-public-key", "analyze-expense-hj-v2",
                    new ExpenseReviewEvaluator(), new ExpenseAiDiagnostics(new MockEnvironment()), null);
            var result = service.analyze(new DocumentVersion("test", "receipts", 1, "synthetic.pdf",
                    "application/pdf", 10, "test-user/synthetic.pdf", Instant.now()));
            assertTrue(headersCorrect.get());
            assertEquals("AI_ERROR", result.source());
            assertEquals(401, result.metadata().get("httpStatus"));
            assertEquals("FUNCTION_AUTH_SUSPECTED", result.metadata().get("authStageHint"));
        } finally {
            SecurityContextHolder.clearContext();
            server.stop(0);
        }
    }
    @Test void allowsOnlySafeGatewayDiagnosticCodes() {
        assertEquals("UNAUTHORIZED_ASYMMETRIC_JWT",
                SupabaseEdgeAiAnalysisService.diagnosticCode("UNAUTHORIZED_ASYMMETRIC_JWT"));
        assertEquals("NONE", SupabaseEdgeAiAnalysisService.diagnosticCode(null));
        assertEquals("NONE", SupabaseEdgeAiAnalysisService.diagnosticCode("bad value\nAuthorization: Bearer secret"));
    }
}
