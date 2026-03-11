package com.jeolgamai.backend.domain.prometheusintegration.service;

import com.jeolgamai.backend.domain.prometheusintegration.dto.PrometheusIntegrationCreateRequest;
import com.jeolgamai.backend.domain.prometheusintegration.dto.PrometheusIntegrationResponse;
import com.jeolgamai.backend.domain.prometheusintegration.entity.PrometheusIntegration;
import com.jeolgamai.backend.domain.prometheusintegration.repository.PrometheusIntegrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PrometheusIntegrationService {

    private final PrometheusIntegrationRepository prometheusIntegrationRepository;

    public PrometheusIntegrationResponse create(PrometheusIntegrationCreateRequest request) {
        String integrationName = request.getIntegrationName().trim();
        if (prometheusIntegrationRepository.existsByIntegrationName(integrationName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Integration name already exists");
        }

        PrometheusIntegration saved = prometheusIntegrationRepository.save(
                new PrometheusIntegration(
                        integrationName,
                        request.getBaseUrl().trim(),
                        request.getApiToken().trim(),
                        request.isIncludeLatencyQuery()
                )
        );
        return toResponse(saved);
    }

    public List<PrometheusIntegrationResponse> findAll() {
        return prometheusIntegrationRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private PrometheusIntegrationResponse toResponse(PrometheusIntegration integration) {
        return new PrometheusIntegrationResponse(
                integration.getId(),
                integration.getIntegrationName(),
                integration.getBaseUrl(),
                maskToken(integration.getApiToken()),
                integration.isIncludeLatencyQuery(),
                integration.getCreatedAt()
        );
    }

    private String maskToken(String token) {
        if (token == null || token.isBlank()) {
            return "";
        }
        int visibleLength = Math.min(4, token.length());
        return "*".repeat(Math.max(0, token.length() - visibleLength)) + token.substring(token.length() - visibleLength);
    }
}
