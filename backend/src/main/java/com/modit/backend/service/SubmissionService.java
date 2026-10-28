package com.modit.backend.service;

import com.modit.backend.domain.Model.*;
import com.modit.backend.repository.InMemoryRepository;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SubmissionService {
    private static final long MAX_BYTES = 20L * 1024 * 1024;
    private final InMemoryRepository repository;
    private final AiAnalysisService ai;
    private final LocalFileStorage storage;
    public SubmissionService(InMemoryRepository repository, AiAnalysisService ai, LocalFileStorage storage) {
        this.repository = repository; this.ai = ai; this.storage = storage;
    }
    public CaseFile caseFile(String projectId, String applicantId) { return repository.caseFile(projectId, applicantId); }
    public List<Requirement> requirements(String projectId) { return repository.requirements(projectId); }
    private void requireRequirement(String projectId, String requirementId) {
        if (requirements(projectId).stream().noneMatch(r -> r.id().equals(requirementId))) throw new NoSuchElementException("서류 항목을 찾을 수 없습니다.");
    }
    private DocumentVersion latest(CaseFile c, String requirementId) {
        List<DocumentVersion> versions = c.documents.get(requirementId);
        if (versions == null || versions.isEmpty()) throw new NoSuchElementException("업로드된 서류가 없습니다.");
        return versions.getLast();
    }
    private Inspection latestInspection(CaseFile c, DocumentVersion doc) {
        return c.inspections.stream().filter(i -> i.documentId().equals(doc.id())).reduce((a,b) -> b).orElse(null);
    }
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("파일이 비어 있습니다.");
        if (file.getSize() > MAX_BYTES) throw new IllegalArgumentException("파일은 20MB 이하여야 합니다.");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        String mime = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        try {
            byte[] first = file.getInputStream().readNBytes(12);
            boolean pdf = name.endsWith(".pdf") && mime.equals("application/pdf") && starts(first, "%PDF-".getBytes());
            boolean png = name.endsWith(".png") && mime.equals("image/png") && starts(first, new byte[]{(byte)137,80,78,71,13,10,26,10});
            boolean jpg = (name.endsWith(".jpg") || name.endsWith(".jpeg")) && mime.equals("image/jpeg") && starts(first, new byte[]{(byte)255,(byte)216,(byte)255});
            boolean gif = name.endsWith(".gif") && mime.equals("image/gif") && (starts(first, "GIF87a".getBytes()) || starts(first, "GIF89a".getBytes()));
            boolean webp = name.endsWith(".webp") && mime.equals("image/webp") && starts(first, "RIFF".getBytes()) && first.length >= 12 && Arrays.equals(Arrays.copyOfRange(first,8,12), "WEBP".getBytes());
            if (!(pdf || png || jpg || gif || webp)) throw new IllegalArgumentException("PDF, PNG, JPEG, GIF, WebP 형식의 정상 파일만 업로드할 수 있습니다.");
        } catch (IOException e) { throw new IllegalArgumentException("파일을 읽을 수 없습니다.", e); }
    }
    private boolean starts(byte[] value, byte[] prefix) { return value.length >= prefix.length && Arrays.equals(Arrays.copyOf(value,prefix.length),prefix); }

    public DocumentVersion upload(String projectId, String applicantId, String requirementId, MultipartFile file) {
        requireRequirement(projectId, requirementId); validateFile(file);
        CaseFile c = caseFile(projectId, applicantId);
        synchronized (c) {
            if (c.status != SubmissionStatus.DRAFT && c.status != SubmissionStatus.NEEDS_REVISION) throw new IllegalStateException("현재 상태에서는 서류를 업로드할 수 없습니다.");
            if (c.status == SubmissionStatus.NEEDS_REVISION && !c.feedback.getLast().targetRequirementIds().contains(requirementId)) throw new IllegalStateException("보완 대상 서류만 교체할 수 있습니다.");
            List<DocumentVersion> versions = c.documents.computeIfAbsent(requirementId, ignored -> new ArrayList<>());
            int version = versions.size() + 1;
            String key = storage.save(projectId, applicantId, file);
            DocumentVersion doc = new DocumentVersion(UUID.randomUUID().toString(), requirementId, version,
                    Optional.ofNullable(file.getOriginalFilename()).orElse("upload"), file.getContentType(), file.getSize(), key, Instant.now());
            versions.add(doc);
            c.log(c.status == SubmissionStatus.DRAFT ? "UPLOAD" : "REUPLOAD", requirementId + " v" + version);
            inspectLocked(c, doc);
            return doc;
        }
    }
    private Inspection inspectLocked(CaseFile c, DocumentVersion doc) {
        AiAnalysisService.Result result = ai.analyze(doc.requirementId(), doc.version());
        Inspection inspection = new Inspection(UUID.randomUUID().toString(), doc.id(), doc.requirementId(), doc.version(),
                result.status(), result.source(), result.findings(), Instant.now());
        c.inspections.add(inspection);
        c.log(doc.version() == 1 ? "INSPECTION" : "REINSPECTION", doc.requirementId() + " v" + doc.version() + " " + result.status());
        return inspection;
    }
    public Inspection inspect(String projectId, String applicantId, String requirementId) {
        requireRequirement(projectId, requirementId);
        CaseFile c = caseFile(projectId, applicantId);
        synchronized (c) {
            if (c.status != SubmissionStatus.DRAFT && c.status != SubmissionStatus.NEEDS_REVISION) throw new IllegalStateException("현재 상태에서는 검사를 요청할 수 없습니다.");
            return inspectLocked(c, latest(c, requirementId));
        }
    }
    public List<Inspection> inspections(String projectId, String applicantId, String requirementId) {
        requireRequirement(projectId, requirementId);
        CaseFile c = caseFile(projectId, applicantId);
        synchronized (c) { return c.inspections.stream().filter(i -> i.requirementId().equals(requirementId)).toList(); }
    }
    public Map<String, List<DocumentVersion>> documents(String projectId, String applicantId) {
        CaseFile c = caseFile(projectId, applicantId);
        synchronized (c) {
            Map<String, List<DocumentVersion>> result = new LinkedHashMap<>();
            c.documents.forEach((k,v) -> result.put(k, List.copyOf(v)));
            return result;
        }
    }
    public record Download(Resource resource, String fileName, String contentType) {}
    public Download download(String projectId, String applicantId, String requirementId, int version) {
        requireRequirement(projectId, requirementId);
        CaseFile c = caseFile(projectId, applicantId);
        synchronized (c) {
            DocumentVersion doc = c.documents.getOrDefault(requirementId, List.of()).stream().filter(d -> d.version() == version)
                    .findFirst().orElseThrow(() -> new NoSuchElementException("파일 버전을 찾을 수 없습니다."));
            return new Download(storage.read(doc.storageKey()), doc.fileName(), doc.contentType());
        }
    }
    private Map<String,Integer> snapshot(CaseFile c) {
        Map<String,Integer> result = new LinkedHashMap<>();
        c.documents.forEach((k,v) -> { if (!v.isEmpty()) result.put(k, v.getLast().version()); });
        return Map.copyOf(result);
    }
    private boolean allPass(CaseFile c) {
        return requirements(c.projectId).stream().filter(Requirement::required).allMatch(r -> {
            List<DocumentVersion> versions = c.documents.get(r.id());
            if (versions == null || versions.isEmpty()) return false;
            Inspection inspection = latestInspection(c, versions.getLast());
            return inspection != null && inspection.status() == InspectionStatus.PASS;
        });
    }
    public SubmissionEvent submit(String projectId, String applicantId) {
        CaseFile c = caseFile(projectId, applicantId);
        synchronized (c) {
            if (c.status != SubmissionStatus.DRAFT) throw new IllegalStateException("최초 제출은 초안 상태에서만 가능합니다.");
            if (c.documents.isEmpty()) throw new IllegalStateException("업로드한 서류가 없습니다.");
            c.status = allPass(c) ? SubmissionStatus.SUBMITTED : SubmissionStatus.SUBMITTED_INCOMPLETE;
            SubmissionEvent event = new SubmissionEvent(UUID.randomUUID().toString(), 1, c.status, snapshot(c), Instant.now());
            c.submissions.add(event); c.log("SUBMIT", c.status.name()); return event;
        }
    }
    public Feedback requestRevision(String projectId, String applicantId, String comment, List<String> targets) {
        CaseFile c = caseFile(projectId, applicantId);
        synchronized (c) {
            if (c.status != SubmissionStatus.SUBMITTED && c.status != SubmissionStatus.SUBMITTED_INCOMPLETE) throw new IllegalStateException("제출된 신청서에만 보완을 요청할 수 있습니다.");
            if (comment == null || comment.isBlank() || targets == null || targets.isEmpty()) throw new IllegalArgumentException("담당자 의견과 보완 대상이 필요합니다.");
            for (String target : targets) {
                requireRequirement(projectId, target);
                if (!c.submissions.getLast().documentVersions().containsKey(target)) throw new IllegalArgumentException("제출되지 않은 서류는 보완 대상으로 지정할 수 없습니다.");
            }
            Feedback feedback = new Feedback(UUID.randomUUID().toString(), "박담당", comment, List.copyOf(new LinkedHashSet<>(targets)), c.submissions.getLast().documentVersions(), Instant.now());
            c.feedback.add(feedback); c.status = SubmissionStatus.NEEDS_REVISION; c.log("REVISION_REQUEST", String.join(",", feedback.targetRequirementIds())); return feedback;
        }
    }
    public SubmissionEvent resubmit(String projectId, String applicantId) {
        CaseFile c = caseFile(projectId, applicantId);
        synchronized (c) {
            if (c.status != SubmissionStatus.NEEDS_REVISION) throw new IllegalStateException("보완 요청 상태에서만 재제출할 수 있습니다.");
            Feedback feedback = c.feedback.getLast();
            for (String target : feedback.targetRequirementIds()) {
                if (latest(c, target).version() <= feedback.originalVersions().get(target)) throw new IllegalStateException("보완 대상 서류를 모두 교체해야 합니다.");
            }
            if (!allPass(c)) throw new IllegalStateException("필수 서류가 모두 검사 통과해야 재제출할 수 있습니다.");
            c.status = SubmissionStatus.REVIEW_PENDING;
            SubmissionEvent event = new SubmissionEvent(UUID.randomUUID().toString(), c.submissions.size()+1, c.status, snapshot(c), Instant.now());
            c.submissions.add(event); c.log("RESUBMIT", c.status.name()); return event;
        }
    }
}
