package com.jeolgamai.backend.domain.integration.repository;

import com.jeolgamai.backend.domain.integration.entity.ConnectorType;
import com.jeolgamai.backend.domain.integration.entity.IntegrationConnector;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IntegrationConnectorRepository extends JpaRepository<IntegrationConnector, Long> {

    Optional<IntegrationConnector> findByWorkspaceIdAndConnectorType(String workspaceId, ConnectorType connectorType);
}
