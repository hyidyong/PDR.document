package com.modit.backend.service;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

@Service
@ConditionalOnProperty(name="app.storage.provider", havingValue="supabase", matchIfMissing=true)
public class SupabaseFileStorage implements FileStorage {
    private final RestClient client;
    private final String bucket;

    public SupabaseFileStorage(@Value("${app.supabase.url}") String url,
                               @Value("${app.supabase.publishable-key}") String publishableKey,
                               @Value("${app.supabase.storage-bucket:expense-documents}") String bucket) {
        this.bucket = bucket;
        this.client = RestClient.builder().baseUrl(url + "/storage/v1/object")
                .defaultHeader("apikey", publishableKey).build();
    }

    private JwtAuthenticationToken authentication() {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken jwt) return jwt;
        throw new IllegalStateException("인증된 사용자 정보를 찾을 수 없습니다.");
    }

    @Override public String save(String projectId, String applicantId, MultipartFile file) {
        try {
            var auth = authentication();
            String key = auth.getToken().getSubject() + "/" + UUID.randomUUID() + ".pdf";
            client.post().uri("/{bucket}/{key}", bucket, key)
                    .header("Authorization", "Bearer " + auth.getToken().getTokenValue())
                    .contentType(MediaType.APPLICATION_PDF).body(file.getBytes()).retrieve().toBodilessEntity();
            return key;
        } catch (Exception e) {
            throw new IllegalStateException("Supabase Storage에 파일을 저장하지 못했습니다.", e);
        }
    }

    @Override public Resource read(String key) {
        try {
            var auth = authentication();
            byte[] content = client.get().uri("/authenticated/{bucket}/{key}", bucket, key)
                    .header("Authorization", "Bearer " + auth.getToken().getTokenValue())
                    .retrieve().body(byte[].class);
            if (content == null) throw new IllegalStateException("빈 파일 응답입니다.");
            return new ByteArrayResource(content);
        } catch (Exception e) {
            throw new IllegalStateException("Supabase Storage에서 파일을 읽지 못했습니다.", e);
        }
    }
}
