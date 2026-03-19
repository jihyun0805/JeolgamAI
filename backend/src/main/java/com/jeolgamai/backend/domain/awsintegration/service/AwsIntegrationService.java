package com.jeolgamai.backend.domain.awsintegration.service;

import com.jeolgamai.backend.domain.awsintegration.dto.AwsIntegrationCreateRequest;
import com.jeolgamai.backend.domain.awsintegration.dto.AwsIntegrationResponse;
import com.jeolgamai.backend.domain.integration.dto.AwsValidationRequest;
import com.jeolgamai.backend.domain.integration.dto.AwsValidationResponse;
import com.jeolgamai.backend.domain.integration.entity.ConnectorType;
import com.jeolgamai.backend.domain.integration.entity.IntegrationConnector;
import com.jeolgamai.backend.domain.integration.repository.IntegrationConnectorRepository;
import com.jeolgamai.backend.domain.integration.service.AwsCallerIdentityService;
import com.jeolgamai.backend.domain.integration.service.AwsValidationService;
import com.jeolgamai.backend.domain.integration.service.ConnectorRegistryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AwsIntegrationService {

    private final AwsValidationService awsValidationService;
    private final AwsCallerIdentityService awsCallerIdentityService;
    private final ConnectorRegistryService connectorRegistryService;
    private final IntegrationConnectorRepository integrationConnectorRepository;

    public AwsIntegrationResponse create(AwsIntegrationCreateRequest request) {
        String workspaceId = requireText(request.getWorkspaceId(), "workspaceId is required");
        String integrationName = requireText(request.getIntegrationName(), "integrationName is required");
        String region = requireText(request.getRegion(), "region is required");
        String authMethod = requireText(request.getAuthMethod(), "authMethod is required");

        String roleArn = trimToNull(request.getRoleArn());
        String externalId = trimToNull(request.getExternalId());
        String accessKeyId = trimToNull(request.getAccessKeyId());
        String secretAccessKey = trimToNull(request.getSecretAccessKey());

        String authMode = normalizeAuthMode(authMethod);
        validateCredentials(authMode, roleArn, accessKeyId, secretAccessKey);

        AwsValidationRequest validationRequest = new AwsValidationRequest();
        validationRequest.setWorkspaceId(workspaceId);
        validationRequest.setAuthMode(authMode);
        validationRequest.setRegion(region);
        validationRequest.setRoleArn(roleArn);
        validationRequest.setExternalId(externalId);
        validationRequest.setAccessKeyId(accessKeyId);
        validationRequest.setSecretAccessKey(secretAccessKey);

        AwsValidationResponse validationResponse = validateRequest(validationRequest);
        AwsCredentialsProvider credentialsProvider = createCredentialsProvider(validationRequest);
        AwsCallerIdentityService.AwsCallerIdentity callerIdentity =
                awsCallerIdentityService.resolve(region, credentialsProvider);
        LocalDateTime validatedAt = LocalDateTime.now();

        connectorRegistryService.saveAwsConnector(
                new ConnectorRegistryService.AwsConnectorConfig(
                        workspaceId,
                        integrationName,
                        authMode,
                        region,
                        roleArn,
                        externalId,
                        accessKeyId,
                        secretAccessKey,
                        callerIdentity.accountId(),
                        callerIdentity.callerArn(),
                        validationResponse.status(),
                        validatedAt.toString()
                )
        );

        IntegrationConnector connector = integrationConnectorRepository
                .findByWorkspaceIdAndConnectorType(workspaceId, ConnectorType.AWS)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "AWS integration was saved but could not be reloaded"
                ));

        ConnectorRegistryService.AwsConnectorConfig savedConfig = connectorRegistryService
                .getAwsConnector(workspaceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "AWS integration cache was not available"
                ));

        return toResponse(savedConfig, connector);
    }

    public List<AwsIntegrationResponse> findAll() {
        return integrationConnectorRepository.findAllByConnectorTypeOrderByUpdatedAtDesc(ConnectorType.AWS).stream()
                .map(this::toResponse)
                .toList();
    }

    private AwsIntegrationResponse toResponse(IntegrationConnector connector) {
        ConnectorRegistryService.AwsConnectorConfig config = connectorRegistryService
                .getAwsConnector(connector.getWorkspaceId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "AWS integration payload could not be loaded"
                ));
        return toResponse(config, connector);
    }

    private AwsIntegrationResponse toResponse(
            ConnectorRegistryService.AwsConnectorConfig integration,
            IntegrationConnector connector
    ) {
        return new AwsIntegrationResponse(
                integration.workspaceId(),
                defaultIntegrationName(integration),
                integration.region(),
                toAuthMethodLabel(normalizeAuthMode(integration.authMode())),
                integration.roleArn(),
                integration.externalId(),
                maskAccessKey(integration.accessKeyId()),
                integration.accountId(),
                integration.callerArn(),
                defaultStatus(integration),
                connector.getCreatedAt(),
                connector.getUpdatedAt(),
                parseValidatedAt(integration.validatedAt())
        );
    }

    private void validateCredentials(
            String authMode,
            String roleArn,
            String accessKeyId,
            String secretAccessKey
    ) {
        if ("role".equals(authMode)) {
            if (roleArn == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Role ARN is required for Cross-account IAM Role"
                );
            }
            return;
        }

        if ("access_key".equals(authMode) && (accessKeyId == null || secretAccessKey == null)) {
            throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Access Key ID and Secret Access Key are required for Access Key (fallback)"
            );
        }
    }

    private String normalizeAuthMode(String authMethod) {
        return switch (authMethod) {
            case "Cross-account IAM Role", "role" -> "role";
            case "Access Key (fallback)", "access_key" -> "access_key";
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "authMethod must be either 'Cross-account IAM Role', 'Access Key (fallback)', 'role', or 'access_key'"
            );
        };
    }

    private String toAuthMethodLabel(String authMode) {
        return "access_key".equals(authMode) ? "Access Key (fallback)" : "Cross-account IAM Role";
    }

    private String requireText(String value, String message) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return trimmed;
    }

    private String defaultIntegrationName(ConnectorRegistryService.AwsConnectorConfig config) {
        if (config.integrationName() != null && !config.integrationName().isBlank()) {
            return config.integrationName();
        }
        return "aws-" + config.workspaceId().toLowerCase(Locale.ROOT);
    }

    private String maskAccessKey(String accessKeyId) {
        if (accessKeyId == null || accessKeyId.isBlank()) {
            return null;
        }
        if (accessKeyId.length() <= 4) {
            return "*".repeat(accessKeyId.length());
        }
        return accessKeyId.substring(0, 4) + "*".repeat(accessKeyId.length() - 4);
    }

    private String defaultStatus(ConnectorRegistryService.AwsConnectorConfig config) {
        return config.status() == null || config.status().isBlank() ? "active" : config.status();
    }

    private AwsValidationResponse validateRequest(AwsValidationRequest request) {
        try {
            return awsValidationService.validate(request);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }

    private AwsCredentialsProvider createCredentialsProvider(AwsValidationRequest request) {
        try {
            return awsValidationService.createCredentialsProvider(request);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }

    private LocalDateTime parseValidatedAt(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalDateTime.parse(value);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
