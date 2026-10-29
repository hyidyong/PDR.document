package com.modit.backend.api;

import com.modit.backend.api.ApiDtos.*;
import com.modit.backend.repository.InMemoryRepository;
import com.modit.backend.service.SubmissionService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/projects/{projectId}")
public class ApplicantController {
    private final InMemoryRepository repository;
    private final SubmissionService service;
    private final DevAccess access;
    public ApplicantController(InMemoryRepository repository, SubmissionService service, DevAccess access) {
        this.repository = repository; this.service = service; this.access = access;
    }
    @GetMapping public Object project(@PathVariable String projectId) { return repository.project(projectId); }
    @GetMapping("/requirements") public Object requirements(@PathVariable String projectId) { return service.requirements(projectId); }
    @PostMapping("/applicants/verify") public ApplicantView verify(@PathVariable String projectId, @Valid @RequestBody VerifyRequest request) {
        ApplicantView applicant = ApplicantView.of(repository.verify(projectId, request.name(), request.studentId()));
        access.applicant(applicant.id());
        return applicant;
    }
    @GetMapping("/applicants/me") public ApplicantView currentApplicant(@PathVariable String projectId) {
        return ApplicantView.of(repository.applicant(projectId, access.applicantId()));
    }
    @GetMapping("/applicants/{applicantId}") public ApplicantView applicant(@PathVariable String projectId, @PathVariable String applicantId) {
        access.applicant(applicantId); return ApplicantView.of(repository.applicant(projectId, applicantId));
    }
    @PostMapping(value="/applicants/{applicantId}/documents/{requirementId}", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentView upload(@PathVariable String projectId, @PathVariable String applicantId,
                               @PathVariable String requirementId, @RequestPart("file") MultipartFile file) {
        access.applicant(applicantId); return DocumentView.of(service.upload(projectId, applicantId, requirementId, file));
    }
    @GetMapping("/applicants/{applicantId}/documents")
    public Map<String, List<DocumentView>> documents(@PathVariable String projectId, @PathVariable String applicantId) {
        access.applicant(applicantId);
        Map<String, List<DocumentView>> result = new LinkedHashMap<>();
        service.documents(projectId, applicantId).forEach((key,value) -> result.put(key, value.stream().map(DocumentView::of).toList()));
        return result;
    }
    @GetMapping("/applicants/{applicantId}/documents/{requirementId}/versions/{version}/file")
    public ResponseEntity<Resource> download(@PathVariable String projectId, @PathVariable String applicantId,
                                             @PathVariable String requirementId, @PathVariable int version) {
        access.applicant(applicantId);
        SubmissionService.Download file = service.download(projectId, applicantId, requirementId, version);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.fileName()).build().toString())
                .body(file.resource());
    }
    @PostMapping("/applicants/{applicantId}/documents/{requirementId}/inspections")
    public Object inspect(@PathVariable String projectId, @PathVariable String applicantId, @PathVariable String requirementId) {
        access.applicant(applicantId); return service.inspect(projectId, applicantId, requirementId);
    }
    @GetMapping("/applicants/{applicantId}/documents/{requirementId}/inspections")
    public Object inspections(@PathVariable String projectId, @PathVariable String applicantId, @PathVariable String requirementId) {
        access.applicant(applicantId); return service.inspections(projectId, applicantId, requirementId);
    }
    @PostMapping("/applicants/{applicantId}/submission")
    public Object submit(@PathVariable String projectId, @PathVariable String applicantId) {
        access.applicant(applicantId); return service.submit(projectId, applicantId);
    }
    @GetMapping("/applicants/{applicantId}/submission")
    public CaseView submission(@PathVariable String projectId, @PathVariable String applicantId) {
        access.applicant(applicantId); var c = service.caseFile(projectId, applicantId);
        synchronized (c) { return CaseView.of(c); }
    }
    @GetMapping("/applicants/{applicantId}/feedback")
    public Object feedback(@PathVariable String projectId, @PathVariable String applicantId) {
        access.applicant(applicantId); var c = service.caseFile(projectId, applicantId);
        synchronized (c) { return List.copyOf(c.feedback); }
    }
    @PostMapping("/applicants/{applicantId}/resubmission")
    public Object resubmit(@PathVariable String projectId, @PathVariable String applicantId) {
        access.applicant(applicantId); return service.resubmit(projectId, applicantId);
    }
    @GetMapping("/applicants/{applicantId}/history")
    public HistoryView history(@PathVariable String projectId, @PathVariable String applicantId) {
        access.applicant(applicantId); var c = service.caseFile(projectId, applicantId);
        synchronized (c) { return HistoryView.of(c); }
    }
}
