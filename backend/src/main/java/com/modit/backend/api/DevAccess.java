package com.modit.backend.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.util.Map;

@Component
public class DevAccess {
    private final boolean mockAuthEnabled;
    public DevAccess(@Value("${app.mock-auth-enabled:false}") boolean mockAuthEnabled) { this.mockAuthEnabled = mockAuthEnabled; }
    public String applicantId() {
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken authentication))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Supabase 로그인이 필요합니다.");
        Object claim = authentication.getToken().getClaim("app_metadata");
        if (!(claim instanceof Map<?, ?> metadata) || !(metadata.get("applicant_id") instanceof String applicantId) || applicantId.isBlank())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "계정에 신청자 ID가 등록되지 않았습니다.");
        return applicantId;
    }
    private String header(String name) {
        return ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest().getHeader(name);
    }
    public void applicant(String applicantId) {
        if (!applicantId.equals(applicantId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "신청자 접근 권한이 없습니다.");
    }
    public void reviewer() {
        if (!mockAuthEnabled) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "개발용 담당자 API가 비활성화되어 있습니다.");
        if (!"REVIEWER".equals(header("X-Dev-Role"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "개발용 담당자 권한이 필요합니다.");
    }
}
