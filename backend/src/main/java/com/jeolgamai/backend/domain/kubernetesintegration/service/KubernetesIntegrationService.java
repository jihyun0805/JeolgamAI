package com.jeolgamai.backend.domain.kubernetesintegration.service;

import com.jeolgamai.backend.domain.kubernetesintegration.dto.KubernetesIntegrationCreateRequest;
import com.jeolgamai.backend.domain.kubernetesintegration.dto.KubernetesIntegrationResponse;
import com.jeolgamai.backend.domain.kubernetesintegration.entity.KubernetesIntegration;
import com.jeolgamai.backend.domain.kubernetesintegration.repository.KubernetesIntegrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KubernetesIntegrationService {

    private final KubernetesIntegrationRepository kubernetesIntegrationRepository;

    public KubernetesIntegrationResponse create(KubernetesIntegrationCreateRequest request) {
        String integrationName = request.getIntegrationName().trim();
        if (kubernetesIntegrationRepository.existsByIntegrationName(integrationName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Integration name already exists");
        }

        KubernetesIntegration saved = kubernetesIntegrationRepository.save(
                new KubernetesIntegration(
                        integrationName,
                        request.getClusterName().trim(),
                        request.getApiServerUrl().trim(),
                        request.getReadOnlyToken().trim()
                )
        );
        return toResponse(saved);
    }

    public List<KubernetesIntegrationResponse> findAll() {
        return kubernetesIntegrationRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private KubernetesIntegrationResponse toResponse(KubernetesIntegration integration) {
        return new KubernetesIntegrationResponse(
                integration.getId(),
                integration.getIntegrationName(),
                integration.getClusterName(),
                integration.getApiServerUrl(),
                maskToken(integration.getReadOnlyToken()),
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
