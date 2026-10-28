package com.modit.backend.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DevAccess {
    private final boolean mockAuthEnabled;
    public DevAccess(@Value("${app.mock-auth-enabled:false}") boolean mockAuthEnabled) { this.mockAuthEnabled = mockAuthEnabled; }
    public void requireMockAuth() {
        if (!mockAuthEnabled) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "실제 인증이 아직 연결되지 않았습니다.");
    }
    private String header(String name) {
        return ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest().getHeader(name);
    }
    public void applicant(String applicantId) {
        requireMockAuth();
        if (!applicantId.equals(header("X-Dev-Applicant-Id"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "신청자 접근 권한이 없습니다.");
    }
    public void reviewer() {
        requireMockAuth();
        if (!"REVIEWER".equals(header("X-Dev-Role"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "개발용 담당자 권한이 필요합니다.");
    }
}
