package com.modit.backend.api;

import com.modit.backend.api.ApiDtos.FeedbackRequest;
import com.modit.backend.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@Profile("dev")
@RestController
@RequestMapping("/api/dev/projects/{projectId}/applicants/{applicantId}")
public class DevReviewController {
    private final SubmissionService service;
    private final DevAccess access;
    public DevReviewController(SubmissionService service, DevAccess access) { this.service = service; this.access = access; }
    @PostMapping("/feedback")
    public Object requestRevision(@PathVariable String projectId, @PathVariable String applicantId,
                                  @Valid @RequestBody FeedbackRequest request) {
        access.reviewer(); return service.requestRevision(projectId, applicantId, request.comment(), request.targetRequirementIds());
    }
}
