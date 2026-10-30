package com.modit.backend;

import com.modit.backend.domain.Model.*;
import com.modit.backend.service.SubmissionService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"app.storage-root=build/test-uploads", "app.storage.provider=local",
        "app.supabase.url=https://test.supabase.co"})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
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
        assertThrows(IllegalStateException.class, () -> service.submit(PROJECT, APPLICANT));
        service.upload(PROJECT, APPLICANT, "contract", pdf("contract2.pdf"));
        service.upload(PROJECT, APPLICANT, "receipts", pdf("receipts2.pdf"));
        assertEquals(SubmissionStatus.SUBMITTED, service.submit(PROJECT, APPLICANT).status());
        var feedback = service.requestRevision(PROJECT, APPLICANT, "계약서와 증빙을 수정해 주세요.", List.of("contract", "receipts"));
        assertEquals(SubmissionStatus.NEEDS_REVISION, c.status);
        assertThrows(IllegalStateException.class, () -> service.resubmit(PROJECT, APPLICANT));
        assertThrows(IllegalStateException.class, () -> service.upload(PROJECT, APPLICANT, "plan", pdf("plan2.pdf")));
        service.upload(PROJECT, APPLICANT, "contract", pdf("contract3.pdf"));
        assertEquals(SubmissionStatus.NEEDS_REVISION, c.status);
        assertThrows(IllegalStateException.class, () -> service.resubmit(PROJECT, APPLICANT));
        service.upload(PROJECT, APPLICANT, "receipts", pdf("receipts3.pdf"));
        assertEquals(SubmissionStatus.NEEDS_REVISION, c.status);
        assertEquals(SubmissionStatus.REVIEW_PENDING, service.resubmit(PROJECT, APPLICANT).status());
        assertEquals(2, c.submissions.size());
        assertEquals(1, c.feedback.size());
        assertEquals(feedback.id(), c.feedback.getFirst().id());
        assertEquals(1, service.documents(PROJECT, APPLICANT).get("plan").size());
        assertEquals(3, service.documents(PROJECT, APPLICANT).get("contract").size());
        assertEquals(InspectionStatus.PASS, service.inspections(PROJECT, APPLICANT, "contract").getLast().status());
        assertEquals(3, c.submissions.getLast().documentVersions().get("contract"));
        assertEquals(2, c.submissions.getFirst().documentVersions().get("contract"));
    }
    @Test void submissionRequiresEveryRequiredDocumentToPass() {
        service.upload(PROJECT, APPLICANT, "plan", pdf("plan.pdf"));
        var missing = assertThrows(IllegalStateException.class, () -> service.submit(PROJECT, APPLICANT));
        assertTrue(missing.getMessage().contains("필수 서류"));
        service.upload(PROJECT, APPLICANT, "contract", pdf("contract.pdf"));
        service.upload(PROJECT, APPLICANT, "receipts", pdf("receipts.pdf"));
        assertThrows(IllegalStateException.class, () -> service.submit(PROJECT, APPLICANT));
        service.upload(PROJECT, APPLICANT, "contract", pdf("contract-revised.pdf"));
        service.upload(PROJECT, APPLICANT, "receipts", pdf("receipts-revised.pdf"));
        assertEquals(SubmissionStatus.SUBMITTED, service.submit(PROJECT, APPLICANT).status());
    }
    @Test void rejectsSpoofedAndUnsupportedFiles() {
        assertThrows(IllegalArgumentException.class, () -> service.upload(PROJECT, APPLICANT, "plan",
                new MockMultipartFile("file", "fake.pdf", "application/pdf", "not a pdf".getBytes(StandardCharsets.UTF_8))));
        assertThrows(IllegalArgumentException.class, () -> service.upload(PROJECT, APPLICANT, "plan",
                new MockMultipartFile("file", "bad.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8))));
    }

    @Test void recordsSizeLimitInsteadOfPretendingLargePdfWasAnalyzed() {
        byte[] content = new byte[4 * 1024 * 1024 + 1];
        byte[] header = "%PDF-1.4\n".getBytes(StandardCharsets.UTF_8);
        System.arraycopy(header, 0, content, 0, header.length);
        service.upload(PROJECT, APPLICANT, "plan", new MockMultipartFile("file", "large.pdf", "application/pdf", content));

        var inspection = service.inspections(PROJECT, APPLICANT, "plan").getLast();
        assertEquals(InspectionStatus.UNVERIFIABLE, inspection.status());
        assertEquals("SIZE_LIMIT", inspection.source());
        assertFalse(inspection.findings().isEmpty());
    }

    @Test void retryingInspectionKeepsTheExistingDocumentVersion() {
        service.upload(PROJECT, APPLICANT, "receipts", pdf("receipts.pdf"));

        service.inspect(PROJECT, APPLICANT, "receipts");

        assertEquals(1, service.documents(PROJECT, APPLICANT).get("receipts").size());
        assertEquals(1, service.documents(PROJECT, APPLICANT).get("receipts").getFirst().version());
        assertEquals(2, service.inspections(PROJECT, APPLICANT, "receipts").size());
    }
}
