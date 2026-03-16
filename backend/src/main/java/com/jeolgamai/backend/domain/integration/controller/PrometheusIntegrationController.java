package com.jeolgamai.backend.domain.integration.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.integration.dto.PrometheusOverviewResponse;
import com.jeolgamai.backend.domain.integration.dto.PrometheusValidationRequest;
import com.jeolgamai.backend.domain.integration.dto.PrometheusValidationResponse;
import com.jeolgamai.backend.domain.integration.service.PrometheusIntegrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations/prometheus")
@RequiredArgsConstructor
@Tag(name = "Prometheus Integration", description = "Prometheus 연동 및 overview 조회 API")
public class PrometheusIntegrationController {

    private final PrometheusIntegrationService prometheusIntegrationService;

    @PostMapping("/validate")
    @Operation(summary = "Prometheus 연결 검증 및 backend connector 저장")
    public ResponseEntity<BaseResponse<PrometheusValidationResponse>> validate(
            @Valid @RequestBody PrometheusValidationRequest request
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "Prometheus 연결 검증 성공",
                            prometheusIntegrationService.validate(request)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @GetMapping("/overview")
    @Operation(summary = "Prometheus overview 조회")
    public ResponseEntity<BaseResponse<PrometheusOverviewResponse>> overview(
            @RequestParam String workspaceId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "Prometheus overview 조회 성공",
                            prometheusIntegrationService.getOverview(workspaceId, from, to)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }
}
