package com.jeolgamai.backend.domain.integration.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.integration.dto.AwsInfrastructureResponse;
import com.jeolgamai.backend.domain.integration.dto.AwsValidationRequest;
import com.jeolgamai.backend.domain.integration.dto.AwsValidationResponse;
import com.jeolgamai.backend.domain.integration.service.AwsInfrastructureService;
import com.jeolgamai.backend.domain.integration.service.AwsValidationService;
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
@RequestMapping("/api/integrations/aws")
@RequiredArgsConstructor
@Tag(name = "AWS Integration", description = "AWS 연동 및 인프라 조회 API")
public class AwsIntegrationController {

    private final AwsValidationService awsValidationService;
    private final AwsInfrastructureService awsInfrastructureService;

    @PostMapping("/validate")
    @Operation(summary = "AWS 연결 검증 및 backend connector 저장")
    public ResponseEntity<BaseResponse<AwsValidationResponse>> validate(
            @Valid @RequestBody AwsValidationRequest request
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "AWS 연결 검증 성공",
                            awsValidationService.validate(request)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }

    @GetMapping("/infrastructure")
    @Operation(summary = "AWS 인프라 요약 조회")
    public ResponseEntity<BaseResponse<AwsInfrastructureResponse>> infrastructure(
            @RequestParam String workspaceId
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "AWS 인프라 조회 성공",
                            awsInfrastructureService.getInfrastructure(workspaceId)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }
}
