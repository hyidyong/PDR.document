package com.modit.backend.repository;

import com.modit.backend.domain.Model.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryRepository {
    private final Map<String, Project> projects = Map.of("modit-2026", new Project("modit-2026", "MODIT 해커톤"));
    private final Map<String, List<Requirement>> requirements = Map.of("modit-2026", List.of(
            new Requirement("plan", "사업계획서", true),
            new Requirement("contract", "계약서", true),
            new Requirement("receipts", "지출 증빙", true)));
    private final Map<String, Applicant> applicants = Map.of("modit-2026:applicant-001",
            new Applicant("applicant-001", "modit-2026", "김청년", "20231234"));
    private final Map<String, CaseFile> cases = new ConcurrentHashMap<>();

    public Project project(String id) { return Optional.ofNullable(projects.get(id)).orElseThrow(() -> new NoSuchElementException("프로젝트를 찾을 수 없습니다.")); }
    public List<Requirement> requirements(String projectId) { project(projectId); return requirements.get(projectId); }
    public Applicant applicant(String projectId, String applicantId) {
        return Optional.ofNullable(applicants.get(projectId + ":" + applicantId)).orElseThrow(() -> new NoSuchElementException("신청자를 찾을 수 없습니다."));
    }
    public Applicant verify(String projectId, String name, String studentId) {
        project(projectId);
        return applicants.values().stream().filter(a -> a.projectId().equals(projectId) && a.name().equals(name) && a.studentId().equals(studentId))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("본인 확인 정보가 일치하지 않습니다."));
    }
    public CaseFile caseFile(String projectId, String applicantId) {
        applicant(projectId, applicantId);
        return cases.computeIfAbsent(projectId + ":" + applicantId, ignored -> new CaseFile(projectId, applicantId));
    }
}
