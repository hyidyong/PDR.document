package com.modit.backend.service;

import com.modit.backend.domain.Model.*;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MockAiAnalysisService implements AiAnalysisService {
    @Override public Result analyze(String requirementId, int version) {
        if (version > 1 || requirementId.equals("plan")) return new Result(InspectionStatus.PASS, List.of(), "MOCK");
        if (requirementId.equals("contract")) return new Result(InspectionStatus.RECOMMEND, List.of(
                new Finding("1", "구매자 서명이 누락되었습니다."),
                new Finding("2", "계약서 1,350,000원과 지출 증빙 1,320,000원이 일치하지 않습니다.")), "MOCK");
        if (requirementId.equals("receipts")) return new Result(InspectionStatus.UNVERIFIABLE, List.of(
                new Finding("2", "계약서 금액과 지출 증빙 금액이 일치하지 않습니다.")), "MOCK");
        throw new IllegalArgumentException("알 수 없는 서류입니다.");
    }
}
