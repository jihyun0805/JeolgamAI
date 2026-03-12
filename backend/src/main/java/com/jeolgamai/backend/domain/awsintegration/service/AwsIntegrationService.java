package com.jeolgamai.backend.domain.awsintegration.service;

import com.jeolgamai.backend.domain.awsintegration.dto.AwsIntegrationCreateRequest;
import com.jeolgamai.backend.domain.awsintegration.dto.AwsIntegrationResponse;
import com.jeolgamai.backend.domain.awsintegration.entity.AwsIntegration;
import com.jeolgamai.backend.domain.awsintegration.repository.AwsIntegrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AwsIntegrationService {

    private final AwsIntegrationRepository awsIntegrationRepository;

    public AwsIntegrationResponse create(AwsIntegrationCreateRequest request) {
        String integrationName = request.getIntegrationName().trim();
        if (awsIntegrationRepository.existsByIntegrationName(integrationName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Integration name already exists");
        }

        AwsIntegration saved = awsIntegrationRepository.save(
                new AwsIntegration(
                        integrationName,
                        request.getRegion().trim(),
                        request.getAuthMethod().trim(),
                        request.getRoleArn().trim(),
                        request.getExternalId().trim()
                )
        );
        return toResponse(saved);
    }

    public List<AwsIntegrationResponse> findAll() {
        return awsIntegrationRepository.findAll().stream().map(this::toResponse).toList();
    }

    private AwsIntegrationResponse toResponse(AwsIntegration integration) {
        return new AwsIntegrationResponse(
                integration.getId(),
                integration.getIntegrationName(),
                integration.getRegion(),
                integration.getAuthMethod(),
                integration.getRoleArn(),
                integration.getExternalId(),
                integration.getCreatedAt()
        );
    }
}
