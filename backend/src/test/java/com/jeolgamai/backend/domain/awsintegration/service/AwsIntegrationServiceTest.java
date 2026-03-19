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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AwsIntegrationServiceTest {

    @Mock
    private AwsValidationService awsValidationService;

    @Mock
    private AwsCallerIdentityService awsCallerIdentityService;

    @Mock
    private ConnectorRegistryService connectorRegistryService;

    @Mock
    private IntegrationConnectorRepository integrationConnectorRepository;

    private AwsIntegrationService awsIntegrationService;

    @BeforeEach
    void setUp() {
        awsIntegrationService = new AwsIntegrationService(
                awsValidationService,
                awsCallerIdentityService,
                connectorRegistryService,
                integrationConnectorRepository
        );
    }

    @Test
    void createSavesAwsIntegrationWithCrossAccountIamRole() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "workspace-a",
                "prod-account",
                "ap-northeast-2",
                "role",
                "arn:aws:iam::123456789012:role/CostReader",
                null,
                null,
                null
        );

        IntegrationConnector connector = new IntegrationConnector();
        connector.setWorkspaceId("workspace-a");
        connector.setConnectorType(ConnectorType.AWS);
        connector.setCreatedAt(LocalDateTime.of(2026, 3, 19, 10, 0));
        connector.setUpdatedAt(LocalDateTime.of(2026, 3, 19, 10, 5));

        ConnectorRegistryService.AwsConnectorConfig savedConfig = new ConnectorRegistryService.AwsConnectorConfig(
                "workspace-a",
                "prod-account",
                "role",
                "ap-northeast-2",
                "arn:aws:iam::123456789012:role/CostReader",
                null,
                null,
                null,
                "123456789012",
                "arn:aws:sts::123456789012:assumed-role/CostReader/jeolgamai-validation",
                "active",
                "2026-03-19T10:05:00"
        );

        when(awsValidationService.validate(any())).thenReturn(new AwsValidationResponse("live", "active", List.of()));
        when(awsValidationService.createCredentialsProvider(any(AwsValidationRequest.class))).thenReturn(
                StaticCredentialsProvider.create(AwsBasicCredentials.create("AKIA1234", "secret"))
        );
        when(awsCallerIdentityService.resolve(eq("ap-northeast-2"), any())).thenReturn(
                new AwsCallerIdentityService.AwsCallerIdentity(
                        "123456789012",
                        "arn:aws:sts::123456789012:assumed-role/CostReader/jeolgamai-validation"
                )
        );
        when(integrationConnectorRepository.findByWorkspaceIdAndConnectorType("workspace-a", ConnectorType.AWS))
                .thenReturn(Optional.of(connector));
        when(connectorRegistryService.getAwsConnector("workspace-a")).thenReturn(Optional.of(savedConfig));

        AwsIntegrationResponse response = awsIntegrationService.create(request);

        assertEquals("workspace-a", response.getWorkspaceId());
        assertEquals("prod-account", response.getIntegrationName());
        assertEquals("ap-northeast-2", response.getRegion());
        assertEquals("Cross-account IAM Role", response.getAuthMethod());
        assertEquals("123456789012", response.getAccountId());
        verify(connectorRegistryService).saveAwsConnector(any());
    }

    @Test
    void createSavesAwsIntegrationWithAccessKeyFallback() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "workspace-b",
                "fallback-account",
                "us-east-1",
                "access_key",
                null,
                null,
                "AKIAIOSFODNN7EXAMPLE",
                "secret-access-key"
        );

        IntegrationConnector connector = new IntegrationConnector();
        connector.setWorkspaceId("workspace-b");
        connector.setConnectorType(ConnectorType.AWS);
        connector.setCreatedAt(LocalDateTime.of(2026, 3, 19, 11, 0));
        connector.setUpdatedAt(LocalDateTime.of(2026, 3, 19, 11, 10));

        ConnectorRegistryService.AwsConnectorConfig savedConfig = new ConnectorRegistryService.AwsConnectorConfig(
                "workspace-b",
                "fallback-account",
                "access_key",
                "us-east-1",
                null,
                null,
                "AKIAIOSFODNN7EXAMPLE",
                "secret-access-key",
                "210987654321",
                "arn:aws:iam::210987654321:user/backend",
                "partial",
                "2026-03-19T11:10:00"
        );

        when(awsValidationService.validate(any())).thenReturn(new AwsValidationResponse("live", "partial", List.of()));
        when(awsValidationService.createCredentialsProvider(any(AwsValidationRequest.class))).thenReturn(
                StaticCredentialsProvider.create(AwsBasicCredentials.create("AKIA1234", "secret"))
        );
        when(awsCallerIdentityService.resolve(eq("us-east-1"), any())).thenReturn(
                new AwsCallerIdentityService.AwsCallerIdentity(
                        "210987654321",
                        "arn:aws:iam::210987654321:user/backend"
                )
        );
        when(integrationConnectorRepository.findByWorkspaceIdAndConnectorType("workspace-b", ConnectorType.AWS))
                .thenReturn(Optional.of(connector));
        when(connectorRegistryService.getAwsConnector("workspace-b")).thenReturn(Optional.of(savedConfig));

        AwsIntegrationResponse response = awsIntegrationService.create(request);

        assertEquals("workspace-b", response.getWorkspaceId());
        assertEquals("Access Key (fallback)", response.getAuthMethod());
        assertEquals("AKIA****************", response.getAccessKeyId());
        assertEquals("partial", response.getStatus());
        verify(connectorRegistryService).saveAwsConnector(any());
    }

    @Test
    void createThrowsWhenAuthMethodIsUnsupported() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "workspace-a",
                "prod-account",
                "ap-northeast-2",
                "IAM User",
                "arn:aws:iam::123456789012:role/CostReader",
                "external-id-001",
                null,
                null
        );

        try {
            awsIntegrationService.create(request);
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
            assertEquals(
                    "authMethod must be either 'Cross-account IAM Role', 'Access Key (fallback)', 'role', or 'access_key'",
                    e.getReason()
            );
        }
    }

    @Test
    void createThrowsWhenAccessKeyFallbackCredentialsMissing() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "workspace-b",
                "fallback-account",
                "us-east-1",
                "access_key",
                null,
                null,
                "AKIAIOSFODNN7EXAMPLE",
                null
        );

        try {
            awsIntegrationService.create(request);
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
            assertEquals("Access Key ID and Secret Access Key are required for Access Key (fallback)", e.getReason());
        }
    }

    @Test
    void createThrowsWhenRoleArnMissingForRoleMode() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "workspace-a",
                "prod-account",
                "ap-northeast-2",
                "role",
                null,
                null,
                null,
                null
        );

        try {
            awsIntegrationService.create(request);
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
            assertEquals("Role ARN is required for Cross-account IAM Role", e.getReason());
        }
    }
}
