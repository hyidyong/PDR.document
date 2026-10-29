package com.modit.backend.api;

import com.modit.backend.service.DocumentChecklistEdgeService;
import com.modit.backend.api.ChecklistDtos.ChecklistRequest;
import com.modit.backend.api.ChecklistDtos.ChecklistResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/document-checklist")
public class DocumentChecklistController {
    private final DocumentChecklistEdgeService service;

    public DocumentChecklistController(DocumentChecklistEdgeService service) {
        this.service = service;
    }

    @PostMapping
    public ChecklistResponse generate(@RequestBody ChecklistRequest payload) {
        return service.generate(payload);
    }
}
