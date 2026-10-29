package com.modit.backend.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.modit.backend.api.ChecklistDtos.ChecklistRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

class DocumentChecklistEdgeServiceTest {
    @Test void forwardsJwtAndContractAndHandlesSuccessFailureAndEmptyResponses() throws Exception {
        var server = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        var status = new java.util.concurrent.atomic.AtomicInteger(200);
        var body = new java.util.concurrent.atomic.AtomicReference<>("""
                {"schema_version":"2.0","items":[{"title":"sample","issuer":"issuer","howToObtain":"online",
                "estimatedTime":"one day","sourceUrl":"https://example.com"}],"questions":[],"webSearchUsed":true}
                """);
        var headers = new java.util.concurrent.atomic.AtomicReference<String>();
        var request = new java.util.concurrent.atomic.AtomicReference<String>();
        server.createContext("/functions/v1/generate-document-checklist", exchange -> {
            headers.set(exchange.getRequestHeaders().getFirst("Authorization"));
            request.set(new String(exchange.getRequestBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
            byte[] bytes = body.get().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status.get(), bytes.length == 0 ? -1 : bytes.length);
            if (bytes.length > 0) exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        try {
            var jwt = org.springframework.security.oauth2.jwt.Jwt.withTokenValue("synthetic-test-token")
                    .header("alg", "none").subject("synthetic-user").build();
            SecurityContextHolder.getContext().setAuthentication(
                    new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken(jwt));
            var bridge = new DocumentChecklistEdgeService("http://127.0.0.1:" + server.getAddress().getPort(),
                    "synthetic-public-key", "generate-document-checklist");
            var payload = new ChecklistRequest("sample type", "sample program", null, null, "sample instructions", null);
            var result = bridge.generate(payload);
            assertEquals("Bearer synthetic-test-token", headers.get());
            assertTrue(request.get().contains("sample instructions"));
            assertEquals("issuer", result.items().getFirst().issuer());
            assertEquals("online", result.items().getFirst().howToObtain());
            assertEquals("one day", result.items().getFirst().estimatedTime());
            assertEquals("https://example.com", result.items().getFirst().sourceUrl());
            assertTrue(result.webSearchUsed());
            status.set(429);
            body.set("{}");
            assertEquals(429, assertThrows(ResponseStatusException.class, () -> bridge.generate(payload)).getStatusCode().value());
            status.set(200);
            body.set("");
            assertEquals(502, assertThrows(ResponseStatusException.class, () -> bridge.generate(payload)).getStatusCode().value());
            body.set("{}");
            assertEquals(502, assertThrows(ResponseStatusException.class, () -> bridge.generate(payload)).getStatusCode().value());
            body.set("{\"schema_version\":\"2.0\",\"items\":[],\"questions\":[],\"webSearchUsed\":false}");
            assertTrue(bridge.generate(payload).items().isEmpty());
        } finally { server.stop(0); }
    }
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
