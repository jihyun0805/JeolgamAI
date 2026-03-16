package com.jeolgamai.backend.domain.integration.dto;

public record ConnectorStatusResponse(
        String workspaceId,
        boolean aws,
        boolean k8s,
        boolean prometheus
) {
}
