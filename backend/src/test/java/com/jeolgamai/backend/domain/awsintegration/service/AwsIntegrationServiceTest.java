package com.jeolgamai.backend.domain.awsintegration.service;

import com.jeolgamai.backend.domain.awsintegration.dto.AwsIntegrationCreateRequest;
import com.jeolgamai.backend.domain.awsintegration.dto.AwsIntegrationResponse;
import com.jeolgamai.backend.domain.awsintegration.entity.AwsIntegration;
import com.jeolgamai.backend.domain.awsintegration.repository.AwsIntegrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AwsIntegrationServiceTest {

    @Mock
    private AwsIntegrationRepository awsIntegrationRepository;

    private AwsIntegrationService awsIntegrationService;

    @BeforeEach
    void setUp() {
        awsIntegrationService = new AwsIntegrationService(awsIntegrationRepository);
    }

    @Test
    void createSavesAwsIntegrationWithCrossAccountIamRole() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "prod-account",
                "ap-northeast-2",
                "Cross-account IAM Role",
                "arn:aws:iam::123456789012:role/CostReader",
                "external-id-001",
                null,
                null
        );

        AwsIntegration saved = new AwsIntegration(
                "prod-account",
                "ap-northeast-2",
                "Cross-account IAM Role",
                "arn:aws:iam::123456789012:role/CostReader",
                "external-id-001",
                null,
                null
        );
        saved.setId(1L);

        when(awsIntegrationRepository.existsByIntegrationName("prod-account")).thenReturn(false);
        when(awsIntegrationRepository.save(any(AwsIntegration.class))).thenReturn(saved);

        AwsIntegrationResponse response = awsIntegrationService.create(request);

        assertEquals(1L, response.getId());
        assertEquals("prod-account", response.getIntegrationName());
        assertEquals("ap-northeast-2", response.getRegion());
        verify(awsIntegrationRepository).save(any(AwsIntegration.class));
    }

    @Test
    void createSavesAwsIntegrationWithAccessKeyFallback() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "fallback-account",
                "us-east-1",
                "Access Key (fallback)",
                null,
                null,
                "AKIAIOSFODNN7EXAMPLE",
                "secret-access-key"
        );

        AwsIntegration saved = new AwsIntegration(
                "fallback-account",
                "us-east-1",
                "Access Key (fallback)",
                null,
                null,
                "AKIAIOSFODNN7EXAMPLE",
                "secret-access-key"
        );
        saved.setId(2L);

        when(awsIntegrationRepository.existsByIntegrationName("fallback-account")).thenReturn(false);
        when(awsIntegrationRepository.save(any(AwsIntegration.class))).thenReturn(saved);

        AwsIntegrationResponse response = awsIntegrationService.create(request);

        assertEquals(2L, response.getId());
        assertEquals("Access Key (fallback)", response.getAuthMethod());
        assertEquals("AKIAIOSFODNN7EXAMPLE", response.getAccessKeyId());
        verify(awsIntegrationRepository).save(any(AwsIntegration.class));
    }

    @Test
    void createThrowsWhenIntegrationNameExists() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "prod-account",
                "ap-northeast-2",
                "Cross-account IAM Role",
                "arn:aws:iam::123456789012:role/CostReader",
                "external-id-001",
                null,
                null
        );
        when(awsIntegrationRepository.existsByIntegrationName("prod-account")).thenReturn(true);

        try {
            awsIntegrationService.create(request);
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
            assertEquals("Integration name already exists", e.getReason());
        }
    }

    @Test
    void createThrowsWhenAccessKeyFallbackCredentialsMissing() {
        AwsIntegrationCreateRequest request = new AwsIntegrationCreateRequest(
                "fallback-account",
                "us-east-1",
                "Access Key (fallback)",
                null,
                null,
                "AKIAIOSFODNN7EXAMPLE",
                null
        );
        when(awsIntegrationRepository.existsByIntegrationName("fallback-account")).thenReturn(false);

        try {
            awsIntegrationService.create(request);
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
            assertEquals("Access Key ID and Secret Access Key are required for Access Key (fallback)", e.getReason());
        }
    }
}
