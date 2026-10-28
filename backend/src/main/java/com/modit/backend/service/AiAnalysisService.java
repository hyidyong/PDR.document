package com.modit.backend.service;

import com.modit.backend.domain.Model.*;
import java.util.List;

public interface AiAnalysisService {
    record Result(InspectionStatus status, List<Finding> findings, String source) {}
    Result analyze(String requirementId, int version);
}
