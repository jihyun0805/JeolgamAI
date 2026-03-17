package com.jeolgamai.backend.domain.integration.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.integration.dto.K8sValidationRequest;
import com.jeolgamai.backend.domain.integration.dto.K8sValidationResponse;
import com.jeolgamai.backend.domain.integration.service.K8sValidationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations/k8s")
@RequiredArgsConstructor
@Tag(name = "K8s Integration", description = "Kubernetes 연동 검증 API")
public class K8sValidationController {

    private final K8sValidationService k8sValidationService;

    @PostMapping("/validate")
    @Operation(summary = "Kubernetes API 연결 검증")
    public ResponseEntity<BaseResponse<K8sValidationResponse>> validate(
            @Valid @RequestBody K8sValidationRequest request
    ) {
        try {
            K8sValidationResponse response = k8sValidationService.validate(request);
            return ResponseEntity.ok(
                    BaseResponse.onSuccess("Kubernetes 연결 검증 성공", response)
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }
}
