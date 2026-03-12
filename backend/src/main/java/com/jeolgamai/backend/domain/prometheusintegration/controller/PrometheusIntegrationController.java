package com.jeolgamai.backend.domain.prometheusintegration.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.prometheusintegration.dto.PrometheusIntegrationCreateRequest;
import com.jeolgamai.backend.domain.prometheusintegration.dto.PrometheusIntegrationResponse;
import com.jeolgamai.backend.domain.prometheusintegration.service.PrometheusIntegrationService;
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
@RequestMapping("/api/integrations/prometheus")
@RequiredArgsConstructor
@Tag(name = "Prometheus Integration", description = "Prometheus integration API")
public class PrometheusIntegrationController {

    private final PrometheusIntegrationService prometheusIntegrationService;

    @PostMapping
    public ResponseEntity<BaseResponse<PrometheusIntegrationResponse>> create(
            @Valid @RequestBody PrometheusIntegrationCreateRequest request
    ) {
        PrometheusIntegrationResponse response = prometheusIntegrationService.create(request);
        return ResponseEntity.status(201)
                .body(BaseResponse.onCreate("Prometheus integration created", response));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<PrometheusIntegrationResponse>>> findAll() {
        List<PrometheusIntegrationResponse> response = prometheusIntegrationService.findAll();
        return ResponseEntity.ok(BaseResponse.onSuccess("Prometheus integrations fetched", response));
    }
}
