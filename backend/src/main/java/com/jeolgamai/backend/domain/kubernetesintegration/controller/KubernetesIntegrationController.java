package com.jeolgamai.backend.domain.kubernetesintegration.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.kubernetesintegration.dto.KubernetesIntegrationCreateRequest;
import com.jeolgamai.backend.domain.kubernetesintegration.dto.KubernetesIntegrationResponse;
import com.jeolgamai.backend.domain.kubernetesintegration.service.KubernetesIntegrationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/integrations/kubernetes")
@RequiredArgsConstructor
@Tag(name = "Kubernetes Integration", description = "Kubernetes cluster integration API")
public class KubernetesIntegrationController {

    private final KubernetesIntegrationService kubernetesIntegrationService;

    @PostMapping
    public ResponseEntity<BaseResponse<KubernetesIntegrationResponse>> create(
            @Valid @RequestBody KubernetesIntegrationCreateRequest request
    ) {
        KubernetesIntegrationResponse response = kubernetesIntegrationService.create(request);
        return ResponseEntity.status(201)
                .body(BaseResponse.onCreate("Kubernetes integration created", response));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<KubernetesIntegrationResponse>>> findAll() {
        List<KubernetesIntegrationResponse> response = kubernetesIntegrationService.findAll();
        return ResponseEntity.ok(BaseResponse.onSuccess("Kubernetes integrations fetched", response));
    }
}
