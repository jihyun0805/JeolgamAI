package com.jeolgamai.backend.domain.integration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeolgamai.backend.domain.integration.entity.ConnectorType;
import com.jeolgamai.backend.domain.integration.repository.IntegrationConnectorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConnectorRegistryServiceTest {

    @Mock
    private IntegrationConnectorRepository integrationConnectorRepository;

    @Mock
    private ConnectorCryptoService connectorCryptoService;

    private ConnectorRegistryService connectorRegistryService;

    @BeforeEach
    void setUp() {
        connectorRegistryService = new ConnectorRegistryService(
                new ObjectMapper(),
                integrationConnectorRepository,
                connectorCryptoService
        );
    }

    @Test
    void getK8sConnectorDoesNotFallbackToLegacyWorkspace() {
        when(integrationConnectorRepository.findByWorkspaceIdAndConnectorType("proj_user1_357d84fa", ConnectorType.K8S))
                .thenReturn(Optional.empty());

        Optional<ConnectorRegistryService.K8sConnectorConfig> result =
                connectorRegistryService.getK8sConnector("proj_user1_357d84fa");

        assertTrue(result.isEmpty());
        verify(integrationConnectorRepository)
                .findByWorkspaceIdAndConnectorType("proj_user1_357d84fa", ConnectorType.K8S);
        verify(integrationConnectorRepository, never())
                .findByWorkspaceIdAndConnectorType("ws-jeolgam-default", ConnectorType.K8S);
    }
}
