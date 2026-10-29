package com.modit.backend.service;

import com.modit.backend.domain.Model.*;
import java.util.List;
import java.util.Map;

public interface AiAnalysisService {
    record Result(InspectionStatus status, List<Finding> findings, String source, Map<String, Object> metadata) {
        public Result(InspectionStatus status, List<Finding> findings, String source) {
            this(status, findings, source, Map.of());
        }
    }
    Result analyze(DocumentVersion document);
}
