package com.modit.backend;

import com.modit.backend.domain.Model.*;
import com.modit.backend.service.SubmissionService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "app.storage-root=build/test-uploads")
class SubmissionFlowTest {
    @Autowired SubmissionService service;
    private static final String PROJECT = "modit-2026";
    private static final String APPLICANT = "applicant-001";

    private MockMultipartFile pdf(String name) {
        return new MockMultipartFile("file", name, "application/pdf", "%PDF-1.4\nmock".getBytes(StandardCharsets.UTF_8));
    }
    @Test void uploadSubmitRevisionResubmitKeepsHistory() {
        var c = service.caseFile(PROJECT, APPLICANT);
        assertEquals(SubmissionStatus.DRAFT, c.status);
        service.upload(PROJECT, APPLICANT, "plan", pdf("plan.pdf"));
        service.upload(PROJECT, APPLICANT, "contract", pdf("contract.pdf"));
        service.upload(PROJECT, APPLICANT, "receipts", pdf("receipts.pdf"));
        assertEquals(SubmissionStatus.DRAFT, c.status);
        assertEquals(InspectionStatus.RECOMMEND, service.inspections(PROJECT, APPLICANT, "contract").getLast().status());
        assertEquals("MOCK", service.inspections(PROJECT, APPLICANT, "contract").getLast().source());
        assertEquals(SubmissionStatus.SUBMITTED_INCOMPLETE, service.submit(PROJECT, APPLICANT).status());
        var feedback = service.requestRevision(PROJECT, APPLICANT, "계약서와 증빙을 수정해 주세요.", List.of("contract", "receipts"));
        assertEquals(SubmissionStatus.NEEDS_REVISION, c.status);
        assertThrows(IllegalStateException.class, () -> service.resubmit(PROJECT, APPLICANT));
        assertThrows(IllegalStateException.class, () -> service.upload(PROJECT, APPLICANT, "plan", pdf("plan2.pdf")));
        service.upload(PROJECT, APPLICANT, "contract", pdf("contract2.pdf"));
        assertEquals(SubmissionStatus.NEEDS_REVISION, c.status);
        assertThrows(IllegalStateException.class, () -> service.resubmit(PROJECT, APPLICANT));
        service.upload(PROJECT, APPLICANT, "receipts", pdf("receipts2.pdf"));
        assertEquals(SubmissionStatus.NEEDS_REVISION, c.status);
        assertEquals(SubmissionStatus.REVIEW_PENDING, service.resubmit(PROJECT, APPLICANT).status());
        assertEquals(2, c.submissions.size());
        assertEquals(1, c.feedback.size());
        assertEquals(feedback.id(), c.feedback.getFirst().id());
        assertEquals(1, service.documents(PROJECT, APPLICANT).get("plan").size());
        assertEquals(2, service.documents(PROJECT, APPLICANT).get("contract").size());
        assertEquals(InspectionStatus.PASS, service.inspections(PROJECT, APPLICANT, "contract").getLast().status());
        assertEquals(2, c.submissions.getLast().documentVersions().get("contract"));
        assertEquals(1, c.submissions.getFirst().documentVersions().get("contract"));
    }
    @Test void rejectsSpoofedAndUnsupportedFiles() {
        assertThrows(IllegalArgumentException.class, () -> service.upload(PROJECT, APPLICANT, "plan",
                new MockMultipartFile("file", "fake.pdf", "application/pdf", "not a pdf".getBytes(StandardCharsets.UTF_8))));
        assertThrows(IllegalArgumentException.class, () -> service.upload(PROJECT, APPLICANT, "plan",
                new MockMultipartFile("file", "bad.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8))));
    }
}
