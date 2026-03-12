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
        String authMethod = request.getAuthMethod().trim();
        if (awsIntegrationRepository.existsByIntegrationName(integrationName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Integration name already exists");
        }

        String roleArn = trimToNull(request.getRoleArn());
        String externalId = trimToNull(request.getExternalId());
        String accessKeyId = trimToNull(request.getAccessKeyId());
        String secretAccessKey = trimToNull(request.getSecretAccessKey());

        validateCredentials(authMethod, roleArn, externalId, accessKeyId, secretAccessKey);

        AwsIntegration saved = awsIntegrationRepository.save(
                new AwsIntegration(
                        integrationName,
                        request.getRegion().trim(),
                        authMethod,
                        roleArn,
                        externalId,
                        accessKeyId,
                        secretAccessKey
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
                integration.getAccessKeyId(),
                integration.getCreatedAt()
        );
    }

    private void validateCredentials(
            String authMethod,
            String roleArn,
            String externalId,
            String accessKeyId,
            String secretAccessKey
    ) {
        if ("Cross-account IAM Role".equals(authMethod)) {
            if (roleArn == null || externalId == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Role ARN and External ID are required for Cross-account IAM Role"
                );
            }
            return;
        }

        if ("Access Key (fallback)".equals(authMethod) && (accessKeyId == null || secretAccessKey == null)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Access Key ID and Secret Access Key are required for Access Key (fallback)"
            );
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
