package com.modit.backend.api;

import com.modit.backend.domain.Model.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;

public final class ApiDtos {
    private ApiDtos() {}
    public record VerifyRequest(@NotBlank String name, @NotBlank String studentId) {}
    public record ApplicantView(String id, String projectId, String name) {
        public static ApplicantView of(Applicant a) { return new ApplicantView(a.id(), a.projectId(), a.name()); }
    }
    public record DocumentView(String id, String requirementId, int version, String fileName,
                               String contentType, long size, Instant uploadedAt) {
        public static DocumentView of(DocumentVersion d) {
            return new DocumentView(d.id(), d.requirementId(), d.version(), d.fileName(), d.contentType(), d.size(), d.uploadedAt());
        }
    }
    public record FeedbackRequest(@NotBlank String comment, @NotEmpty List<String> targetRequirementIds) {}
    public record CaseView(String projectId, String applicantId, SubmissionStatus status, Approval approval,
                           Map<String, DocumentView> currentDocuments, Map<String, Inspection> currentInspections,
                           List<SubmissionEvent> submissions, List<Feedback> feedback) {
        public static CaseView of(CaseFile c) {
            Map<String, DocumentView> docs = new LinkedHashMap<>();
            Map<String, Inspection> inspections = new LinkedHashMap<>();
            c.documents.forEach((id, versions) -> {
                if (!versions.isEmpty()) {
                    DocumentVersion d = versions.getLast(); docs.put(id, DocumentView.of(d));
                    c.inspections.stream().filter(i -> i.documentId().equals(d.id())).reduce((a,b) -> b).ifPresent(i -> inspections.put(id, i));
                }
            });
            return new CaseView(c.projectId, c.applicantId, c.status, c.approval, docs, inspections,
                    List.copyOf(c.submissions), List.copyOf(c.feedback));
        }
    }
    public record HistoryView(List<SubmissionEvent> submissions, List<Inspection> inspections,
                              List<Feedback> feedback, List<ActivityLog> activities) {
        public static HistoryView of(CaseFile c) {
            return new HistoryView(List.copyOf(c.submissions), List.copyOf(c.inspections),
                    List.copyOf(c.feedback), List.copyOf(c.activities));
        }
    }
}
