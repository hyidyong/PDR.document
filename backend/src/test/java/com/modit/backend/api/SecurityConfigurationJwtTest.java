package com.modit.backend.api;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.oauth2.jwt.*;

import static org.junit.jupiter.api.Assertions.*;

class SecurityConfigurationJwtTest {
    private HttpServer server;
    private ECKey signingKey;
    private String issuer;
    private JwtDecoder decoder;

    @BeforeEach void setUp() throws Exception {
        signingKey = new ECKeyGenerator(Curve.P_256).keyID("supabase-current-es256-key").generate();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        issuer = "http://127.0.0.1:" + server.getAddress().getPort() + "/auth/v1";
        byte[] jwks = new JWKSet(signingKey.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
        server.createContext("/auth/v1/.well-known/jwks.json", exchange -> {
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, jwks.length);
            exchange.getResponseBody().write(jwks);
            exchange.close();
        });
        server.start();
        decoder = new SecurityConfiguration().jwtDecoder("http://127.0.0.1:" + server.getAddress().getPort());
    }

    @AfterEach void tearDown() { server.stop(0); }

    private String es256Token(ECKey key, String kid, String audience, Instant expiresAt) throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder().subject("49d55a51-79f1-4e1d-88a8-45be74799bf8")
                .issuer(issuer).audience(audience).issueTime(Date.from(expiresAt.minusSeconds(300))).expirationTime(Date.from(expiresAt))
                .claim("app_metadata", Map.of("applicant_id", "applicant-001")).build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.ES256).keyID(kid).type(JOSEObjectType.JWT).build(), claims);
        jwt.sign(new ECDSASigner(key));
        return jwt.serialize();
    }

    @Test void acceptsEs256UsingMatchingKidAndPreservesClaims() throws Exception {
        Jwt jwt = decoder.decode(es256Token(signingKey, signingKey.getKeyID(), "authenticated", Instant.now().plusSeconds(300)));
        assertEquals("49d55a51-79f1-4e1d-88a8-45be74799bf8", jwt.getSubject());
        assertEquals("applicant-001", ((Map<?, ?>) jwt.getClaim("app_metadata")).get("applicant_id"));
    }

    @Test void rejectsUnknownKidWrongAudienceAndExpiredToken() throws Exception {
        ECKey otherKey = new ECKeyGenerator(Curve.P_256).keyID("unknown-key").generate();
        assertThrows(JwtException.class, () -> decoder.decode(es256Token(otherKey, otherKey.getKeyID(), "authenticated", Instant.now().plusSeconds(300))));
        assertThrows(JwtValidationException.class, () -> decoder.decode(es256Token(signingKey, signingKey.getKeyID(), "anon", Instant.now().plusSeconds(300))));
        assertThrows(JwtValidationException.class, () -> decoder.decode(es256Token(signingKey, signingKey.getKeyID(), "authenticated", Instant.now().minusSeconds(60))));
    }

    @Test void rejectsHs256() throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder().subject("user").issuer(issuer).audience("authenticated")
                .expirationTime(Date.from(Instant.now().plusSeconds(300))).build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(new byte[32]));
        assertThrows(JwtException.class, () -> decoder.decode(jwt.serialize()));
    }
}
