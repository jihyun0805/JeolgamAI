package com.jeolgamai.backend.domain.optimization.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.optimization.dto.OptimizationModels;
import com.jeolgamai.backend.domain.optimization.service.OptimizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/optimization")
@RequiredArgsConstructor
@Tag(name = "Optimization", description = "분석/권고/AI 최적화 backend API")
public class OptimizationController {

    private final OptimizationService optimizationService;

    @PostMapping("/analysis/run")
    @Operation(summary = "프로젝트 비용 분석 실행")
    public ResponseEntity<BaseResponse<OptimizationModels.AnalysisBundle>> runAnalysis(
            @Valid @RequestBody OptimizationModels.RunAnalysisRequest request
    ) {
        try {
            return ResponseEntity.status(201).body(
                    BaseResponse.onCreate(
                            "프로젝트 비용 분석 실행 성공",
                            optimizationService.runAnalysis(request)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @GetMapping("/analysis/latest")
    @Operation(summary = "최신 분석 조회")
    public ResponseEntity<BaseResponse<OptimizationModels.AnalysisBundle>> getLatestAnalysis(
            @RequestParam String workspaceId,
            @RequestParam(required = false) String projectName,
            @RequestParam(required = false) String awsRegion
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "최신 분석 조회 성공",
                            optimizationService.getLatestAnalysis(workspaceId, projectName, awsRegion)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @GetMapping("/analysis/{analysisId}")
    @Operation(summary = "분석 상세 조회")
    public ResponseEntity<BaseResponse<OptimizationModels.AnalysisBundle>> getAnalysis(
            @PathVariable String analysisId,
            @RequestParam String workspaceId,
            @RequestParam(required = false) String projectName,
            @RequestParam(required = false) String awsRegion
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "분석 상세 조회 성공",
                            optimizationService.getAnalysis(workspaceId, analysisId, projectName, awsRegion)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @GetMapping("/recommendations")
    @Operation(summary = "최신 권고 목록 조회")
    public ResponseEntity<BaseResponse<OptimizationModels.RecommendationList>> getRecommendations(
            @RequestParam String workspaceId
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "권고 목록 조회 성공",
                            optimizationService.getRecommendations(workspaceId)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @GetMapping("/recommendations/{recommendationId}")
    @Operation(summary = "권고 상세 조회")
    public ResponseEntity<BaseResponse<OptimizationModels.Recommendation>> getRecommendation(
            @PathVariable String recommendationId,
            @RequestParam String workspaceId
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "권고 상세 조회 성공",
                            optimizationService.getRecommendation(workspaceId, recommendationId)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @PostMapping("/recommendations/{recommendationId}/approve")
    @Operation(summary = "권고 승인/반려")
    public ResponseEntity<BaseResponse<OptimizationModels.ApprovalResult>> approveRecommendation(
            @PathVariable String recommendationId,
            @RequestParam String workspaceId,
            @RequestBody OptimizationModels.ApproveRecommendationRequest request
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "권고 승인 상태 변경 성공",
                            optimizationService.approveRecommendation(workspaceId, recommendationId, request)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @GetMapping("/chat")
    @Operation(summary = "AI 최적화 대화 세션 조회")
    public ResponseEntity<BaseResponse<OptimizationModels.ChatSession>> getChatSession(
            @RequestParam String workspaceId,
            @RequestParam String analysisId,
            @RequestParam(required = false) String pinnedRecommendationId
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "대화 세션 조회 성공",
                            optimizationService.getChatSession(workspaceId, analysisId, pinnedRecommendationId)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @PostMapping("/chat")
    @Operation(summary = "AI 최적화 대화 메시지 전송")
    public ResponseEntity<BaseResponse<OptimizationModels.ChatEnvelope>> appendChat(
            @Valid @RequestBody OptimizationModels.ChatRequest request
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "대화 메시지 처리 성공",
                            optimizationService.appendChat(request)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @PostMapping("/reports")
    @Operation(summary = "리포트 생성")
    public ResponseEntity<BaseResponse<OptimizationModels.ReportArtifact>> generateReport(
            @Valid @RequestBody OptimizationModels.GenerateReportRequest request
    ) {
        try {
            return ResponseEntity.status(201).body(
                    BaseResponse.onCreate(
                            "리포트 생성 성공",
                            optimizationService.generateReport(request)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @GetMapping("/reports")
    @Operation(summary = "리포트 목록 또는 PDF 메타데이터 조회")
    public ResponseEntity<BaseResponse<?>> getReports(
            @RequestParam String workspaceId,
            @RequestParam(required = false) String analysisId,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String projectName,
            @RequestParam(required = false) String awsRegion
    ) {
        try {
            if ("pdf".equalsIgnoreCase(format)) {
                return ResponseEntity.ok(
                        BaseResponse.onSuccess(
                                "리포트 PDF 메타데이터 조회 성공",
                                optimizationService.getReportExport(workspaceId, analysisId)
                        )
                );
            }

            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "리포트 목록 조회 성공",
                            optimizationService.listReports(workspaceId, analysisId, projectName, awsRegion)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }
}
