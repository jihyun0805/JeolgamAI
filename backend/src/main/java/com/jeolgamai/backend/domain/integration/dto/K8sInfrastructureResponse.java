package com.jeolgamai.backend.domain.integration.dto;

import java.util.List;
import java.util.Map;

public record K8sInfrastructureResponse(
        String mode,
        String workspaceId,
        String clusterName,
        Summary summary,
        List<Node> nodes,
        List<NamespaceSummary> namespaces,
        List<Deployment> deployments,
        List<Service> services,
        List<Pod> pods,
        List<String> warnings
) {
    public record Summary(
            int nodeCount,
            int namespaceCount,
            int deploymentCount,
            int serviceCount,
            int podCount
    ) {
    }

    public record Node(
            String name,
            String status,
            String version
    ) {
    }

    public record NamespaceSummary(
            String name,
            int podCount,
            int serviceCount,
            int deploymentCount
    ) {
    }

    public record Deployment(
            String namespace,
            String name,
            int replicas,
            int readyReplicas,
            List<String> images,
            Map<String, String> selector
    ) {
    }

    public record Service(
            String namespace,
            String name,
            String type,
            String clusterIP,
            List<String> ports,
            Map<String, String> selector
    ) {
    }

    public record Pod(
            String namespace,
            String name,
            String phase,
            String node,
            String ready,
            int restartCount,
            List<String> images,
            Map<String, String> labels
    ) {
    }
}
