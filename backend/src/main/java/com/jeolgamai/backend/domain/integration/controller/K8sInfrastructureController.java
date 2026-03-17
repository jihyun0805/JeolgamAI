package com.jeolgamai.backend.domain.integration.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.integration.dto.K8sInfrastructureResponse;
import com.jeolgamai.backend.domain.integration.service.K8sInfrastructureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/infrastructure/k8s")
@RequiredArgsConstructor
@Tag(name = "K8s Infrastructure", description = "Kubernetes 인프라 조회 API")
public class K8sInfrastructureController {

    private final K8sInfrastructureService k8sInfrastructureService;

    @GetMapping
    @Operation(summary = "Kubernetes 인프라 조회")
    public ResponseEntity<BaseResponse<K8sInfrastructureResponse>> getInfrastructure(
            @RequestParam String workspaceId
    ) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "Kubernetes 인프라 조회 성공",
                            k8sInfrastructureService.getInfrastructure(workspaceId)
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }
}
