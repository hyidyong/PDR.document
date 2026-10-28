package com.modit.backend.domain;

import java.time.Instant;
import java.util.*;

public final class Model {
    private Model() {}
    public enum SubmissionStatus { DRAFT, SUBMITTED, SUBMITTED_INCOMPLETE, NEEDS_REVISION, REVIEW_PENDING }
    public enum InspectionStatus { PASS, RECOMMEND, UNVERIFIABLE }
    public enum ApprovalStatus { PENDING, APPROVED, REJECTED }
    public record Project(String id, String name) {}
    public record Requirement(String id, String name, boolean required) {}
    public record Applicant(String id, String projectId, String name, String studentId) {}
    public record DocumentVersion(String id, String requirementId, int version, String fileName,
                                  String contentType, long size, String storageKey, Instant uploadedAt) {}
    public record Finding(String id, String message) {}
    public record Inspection(String id, String documentId, String requirementId, int version,
                             InspectionStatus status, String source, List<Finding> findings, Instant checkedAt) {}
    public record Feedback(String id, String author, String comment, List<String> targetRequirementIds,
                           Map<String, Integer> originalVersions, Instant createdAt) {}
    public record Approval(String id, ApprovalStatus status, String reviewer, Instant decidedAt) {}
    public record ActivityLog(String id, String event, String detail, Instant at) {}
    public record SubmissionEvent(String id, int round, SubmissionStatus status,
                                  Map<String, Integer> documentVersions, Instant at) {}

    public static final class CaseFile {
        public final String projectId;
        public final String applicantId;
        public SubmissionStatus status = SubmissionStatus.DRAFT;
        public final Map<String, List<DocumentVersion>> documents = new LinkedHashMap<>();
        public final List<Inspection> inspections = new ArrayList<>();
        public final List<Feedback> feedback = new ArrayList<>();
        public final List<SubmissionEvent> submissions = new ArrayList<>();
        public final List<ActivityLog> activities = new ArrayList<>();
        public Approval approval = new Approval(UUID.randomUUID().toString(), ApprovalStatus.PENDING, null, null);
        public CaseFile(String projectId, String applicantId) {
            this.projectId = projectId; this.applicantId = applicantId;
        }
        public void log(String event, String detail) {
            activities.add(new ActivityLog(UUID.randomUUID().toString(), event, detail, Instant.now()));
        }
    }
}
