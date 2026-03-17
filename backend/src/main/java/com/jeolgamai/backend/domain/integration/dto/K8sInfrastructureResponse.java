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
        List<Ingress> ingresses,
        List<Deployment> deployments,
        List<ReplicaSet> replicaSets,
        List<Service> services,
        List<Endpoint> endpoints,
        List<Pod> pods,
        List<String> warnings
) {
    public record Summary(
            int nodeCount,
            int namespaceCount,
            int deploymentCount,
            int replicaSetCount,
            int serviceCount,
            int ingressCount,
            int endpointCount,
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

    public record ReplicaSet(
            String namespace,
            String name,
            int replicas,
            int readyReplicas,
            String ownerDeployment,
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

    public record Ingress(
            String namespace,
            String name,
            String ingressClass,
            String address,
            List<String> hosts,
            List<String> serviceNames
    ) {
    }

    public record Endpoint(
            String namespace,
            String name,
            int readyAddressCount,
            int notReadyAddressCount,
            List<String> podTargets
    ) {
    }

    public record Pod(
            String namespace,
            String name,
            String phase,
            String node,
            String ownerKind,
            String ownerName,
            String ready,
            int restartCount,
            List<String> images,
            Map<String, String> labels
    ) {
    }
}
