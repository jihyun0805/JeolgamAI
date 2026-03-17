package com.jeolgamai.backend.domain.integration.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeolgamai.backend.domain.integration.dto.K8sInfrastructureResponse;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class K8sInfrastructureService {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);

    private final ConnectorRegistryService connectorRegistryService;
    private final ObjectMapper objectMapper;
    private final K8sApiSupport k8sApiSupport;

    public K8sInfrastructureService(
            ConnectorRegistryService connectorRegistryService,
            ObjectMapper objectMapper,
            K8sApiSupport k8sApiSupport
    ) {
        this.connectorRegistryService = connectorRegistryService;
        this.objectMapper = objectMapper;
        this.k8sApiSupport = k8sApiSupport;
    }

    public K8sInfrastructureResponse getInfrastructure(String workspaceId) {
        ConnectorRegistryService.K8sConnectorConfig connector = connectorRegistryService
                .getK8sConnector(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Kubernetes connector가 backend에 등록되어 있지 않습니다."));

        String baseUrl = k8sApiSupport.normalizeApiServerUrl(connector.apiServerUrl());
        String token = k8sApiSupport.normalizeBearerToken(connector.token());
        HttpClient httpClient = k8sApiSupport.buildHttpClient(connector.caCertPem());

        EndpointPayload nodesPayload = requestJson(httpClient, baseUrl, token, "/api/v1/nodes?limit=50");
        EndpointPayload namespacesPayload = requestJson(httpClient, baseUrl, token, "/api/v1/namespaces?limit=100");
        EndpointPayload podsPayload = requestJson(httpClient, baseUrl, token, "/api/v1/pods?limit=300");
        EndpointPayload servicesPayload = requestJson(httpClient, baseUrl, token, "/api/v1/services?limit=200");
        EndpointPayload deploymentsPayload = requestJson(httpClient, baseUrl, token, "/apis/apps/v1/deployments?limit=200");
        EndpointPayload replicaSetsPayload = requestJson(httpClient, baseUrl, token, "/apis/apps/v1/replicasets?limit=300");
        EndpointPayload ingressesPayload = requestJson(httpClient, baseUrl, token, "/apis/networking.k8s.io/v1/ingresses?limit=200");
        EndpointPayload endpointsPayload = requestJson(httpClient, baseUrl, token, "/api/v1/endpoints?limit=300");

        List<String> warnings = new ArrayList<>();
        collectWarning(warnings, nodesPayload);
        collectWarning(warnings, namespacesPayload);
        collectWarning(warnings, podsPayload);
        collectWarning(warnings, servicesPayload);
        collectWarning(warnings, deploymentsPayload);
        collectWarning(warnings, replicaSetsPayload);
        collectWarning(warnings, ingressesPayload);
        collectWarning(warnings, endpointsPayload);

        if (nodesPayload.payload() == null
                && namespacesPayload.payload() == null
                && podsPayload.payload() == null
                && servicesPayload.payload() == null
                && deploymentsPayload.payload() == null
                && replicaSetsPayload.payload() == null
                && ingressesPayload.payload() == null
                && endpointsPayload.payload() == null) {
            throw new IllegalArgumentException(
                    warnings.isEmpty()
                            ? "Kubernetes API 조회에 실패했습니다."
                            : warnings.get(0)
            );
        }

        List<K8sInfrastructureResponse.Node> nodes = parseNodes(nodesPayload.payload());
        List<K8sInfrastructureResponse.Pod> pods = parsePods(podsPayload.payload());
        List<K8sInfrastructureResponse.Service> services = parseServices(servicesPayload.payload());
        List<K8sInfrastructureResponse.Deployment> deployments = parseDeployments(deploymentsPayload.payload());
        List<K8sInfrastructureResponse.ReplicaSet> replicaSets = parseReplicaSets(replicaSetsPayload.payload());
        List<K8sInfrastructureResponse.Ingress> ingresses = parseIngresses(ingressesPayload.payload());
        List<K8sInfrastructureResponse.Endpoint> endpoints = parseEndpoints(endpointsPayload.payload());
        List<K8sInfrastructureResponse.NamespaceSummary> namespaces = summarizeNamespaces(
                namespacesPayload.payload(),
                pods,
                services,
                deployments
        );

        return new K8sInfrastructureResponse(
                "live",
                workspaceId,
                connector.clusterName(),
                new K8sInfrastructureResponse.Summary(
                        nodes.size(),
                        namespaces.size(),
                        deployments.size(),
                        replicaSets.size(),
                        services.size(),
                        ingresses.size(),
                        endpoints.size(),
                        pods.size()
                ),
                nodes,
                namespaces,
                ingresses,
                deployments,
                replicaSets,
                services,
                endpoints,
                pods,
                warnings.stream().distinct().toList()
        );
    }

    private EndpointPayload requestJson(HttpClient httpClient, String baseUrl, String token, String path) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/json")
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return new EndpointPayload(path, null, k8sApiSupport.describeHttpStatus(path, response.statusCode()));
            }
            return new EndpointPayload(path, objectMapper.readTree(response.body()), null);
        } catch (IOException exception) {
            return new EndpointPayload(path, null, k8sApiSupport.describeConnectionFailure(exception));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new EndpointPayload(path, null, "Kubernetes API 요청이 중단되었습니다.");
        }
    }

    private List<K8sInfrastructureResponse.Node> parseNodes(JsonNode payload) {
        List<K8sInfrastructureResponse.Node> nodes = new ArrayList<>();
        if (payload == null) {
            return nodes;
        }
        for (JsonNode item : payload.path("items")) {
            String name = item.path("metadata").path("name").asText("-");
            String version = item.path("status").path("nodeInfo").path("kubeletVersion").asText("-");
            String status = "Unknown";
            for (JsonNode condition : item.path("status").path("conditions")) {
                if (!"Ready".equals(condition.path("type").asText())) {
                    continue;
                }
                status = switch (condition.path("status").asText()) {
                    case "True" -> "Ready";
                    case "False" -> "NotReady";
                    default -> "Unknown";
                };
            }
            nodes.add(new K8sInfrastructureResponse.Node(name, status, version));
        }
        nodes.sort(Comparator.comparing(K8sInfrastructureResponse.Node::name));
        return nodes;
    }

    private List<K8sInfrastructureResponse.Pod> parsePods(JsonNode payload) {
        List<K8sInfrastructureResponse.Pod> pods = new ArrayList<>();
        if (payload == null) {
            return pods;
        }
        for (JsonNode item : payload.path("items")) {
            int readyCount = 0;
            int totalCount = 0;
            int restartCount = 0;
            for (JsonNode statusItem : item.path("status").path("containerStatuses")) {
                totalCount += 1;
                if (statusItem.path("ready").asBoolean(false)) {
                    readyCount += 1;
                }
                restartCount += statusItem.path("restartCount").asInt(0);
            }

            pods.add(new K8sInfrastructureResponse.Pod(
                    item.path("metadata").path("namespace").asText("default"),
                    item.path("metadata").path("name").asText("-"),
                    item.path("status").path("phase").asText("Unknown"),
                    item.path("spec").path("nodeName").asText("-"),
                    readOwnerKind(item.path("metadata").path("ownerReferences")),
                    readOwnerName(item.path("metadata").path("ownerReferences")),
                    totalCount > 0 ? readyCount + "/" + totalCount : "0/0",
                    restartCount,
                    readStringList(item.path("spec").path("containers"), "image"),
                    readStringMap(item.path("metadata").path("labels"))
            ));
        }
        pods.sort(Comparator.comparing(K8sInfrastructureResponse.Pod::namespace)
                .thenComparing(K8sInfrastructureResponse.Pod::name));
        return pods;
    }

    private List<K8sInfrastructureResponse.Service> parseServices(JsonNode payload) {
        List<K8sInfrastructureResponse.Service> services = new ArrayList<>();
        if (payload == null) {
            return services;
        }
        for (JsonNode item : payload.path("items")) {
            List<String> ports = new ArrayList<>();
            for (JsonNode port : item.path("spec").path("ports")) {
                String protocol = port.path("protocol").asText("TCP");
                String servicePort = port.path("port").asText("?");
                String targetPort = port.path("targetPort").asText(servicePort);
                ports.add(protocol + ":" + servicePort + "->" + targetPort);
            }

            services.add(new K8sInfrastructureResponse.Service(
                    item.path("metadata").path("namespace").asText("default"),
                    item.path("metadata").path("name").asText("-"),
                    item.path("spec").path("type").asText("ClusterIP"),
                    item.path("spec").path("clusterIP").asText("-"),
                    ports,
                    readStringMap(item.path("spec").path("selector"))
            ));
        }
        services.sort(Comparator.comparing(K8sInfrastructureResponse.Service::namespace)
                .thenComparing(K8sInfrastructureResponse.Service::name));
        return services;
    }

    private List<K8sInfrastructureResponse.Deployment> parseDeployments(JsonNode payload) {
        List<K8sInfrastructureResponse.Deployment> deployments = new ArrayList<>();
        if (payload == null) {
            return deployments;
        }
        for (JsonNode item : payload.path("items")) {
            deployments.add(new K8sInfrastructureResponse.Deployment(
                    item.path("metadata").path("namespace").asText("default"),
                    item.path("metadata").path("name").asText("-"),
                    item.path("spec").path("replicas").asInt(0),
                    item.path("status").path("readyReplicas").asInt(0),
                    readStringList(item.path("spec").path("template").path("spec").path("containers"), "image"),
                    readStringMap(item.path("spec").path("selector").path("matchLabels"))
            ));
        }
        deployments.sort(Comparator.comparing(K8sInfrastructureResponse.Deployment::namespace)
                .thenComparing(K8sInfrastructureResponse.Deployment::name));
        return deployments;
    }

    private List<K8sInfrastructureResponse.ReplicaSet> parseReplicaSets(JsonNode payload) {
        List<K8sInfrastructureResponse.ReplicaSet> replicaSets = new ArrayList<>();
        if (payload == null) {
            return replicaSets;
        }
        for (JsonNode item : payload.path("items")) {
            replicaSets.add(new K8sInfrastructureResponse.ReplicaSet(
                    item.path("metadata").path("namespace").asText("default"),
                    item.path("metadata").path("name").asText("-"),
                    item.path("spec").path("replicas").asInt(0),
                    item.path("status").path("readyReplicas").asInt(0),
                    readOwnerName(item.path("metadata").path("ownerReferences")),
                    readStringList(item.path("spec").path("template").path("spec").path("containers"), "image"),
                    readStringMap(item.path("spec").path("selector").path("matchLabels"))
            ));
        }
        replicaSets.sort(Comparator.comparing(K8sInfrastructureResponse.ReplicaSet::namespace)
                .thenComparing(K8sInfrastructureResponse.ReplicaSet::name));
        return replicaSets;
    }

    private List<K8sInfrastructureResponse.Ingress> parseIngresses(JsonNode payload) {
        List<K8sInfrastructureResponse.Ingress> ingresses = new ArrayList<>();
        if (payload == null) {
            return ingresses;
        }
        for (JsonNode item : payload.path("items")) {
            List<String> hosts = new ArrayList<>();
            List<String> serviceNames = new ArrayList<>();
            JsonNode spec = item.path("spec");

            if (spec.path("defaultBackend").path("service").isObject()) {
                String serviceName = spec.path("defaultBackend").path("service").path("name").asText("");
                if (!serviceName.isBlank()) {
                    serviceNames.add(serviceName);
                }
            }

            for (JsonNode rule : spec.path("rules")) {
                String host = rule.path("host").asText("");
                if (!host.isBlank()) {
                    hosts.add(host);
                }
                for (JsonNode path : rule.path("http").path("paths")) {
                    String serviceName = path.path("backend").path("service").path("name").asText("");
                    if (!serviceName.isBlank() && !serviceNames.contains(serviceName)) {
                        serviceNames.add(serviceName);
                    }
                }
            }

            String address = "-";
            for (JsonNode ingressNode : item.path("status").path("loadBalancer").path("ingress")) {
                String hostname = ingressNode.path("hostname").asText("");
                String ip = ingressNode.path("ip").asText("");
                if (!hostname.isBlank()) {
                    address = hostname;
                    break;
                }
                if (!ip.isBlank()) {
                    address = ip;
                    break;
                }
            }

            String ingressClass = spec.path("ingressClassName").asText("");
            if (ingressClass.isBlank()) {
                ingressClass = item.path("metadata").path("annotations")
                        .path("kubernetes.io/ingress.class")
                        .asText("-");
            }

            ingresses.add(new K8sInfrastructureResponse.Ingress(
                    item.path("metadata").path("namespace").asText("default"),
                    item.path("metadata").path("name").asText("-"),
                    ingressClass.isBlank() ? "-" : ingressClass,
                    address,
                    hosts.stream().distinct().toList(),
                    serviceNames
            ));
        }
        ingresses.sort(Comparator.comparing(K8sInfrastructureResponse.Ingress::namespace)
                .thenComparing(K8sInfrastructureResponse.Ingress::name));
        return ingresses;
    }

    private List<K8sInfrastructureResponse.Endpoint> parseEndpoints(JsonNode payload) {
        List<K8sInfrastructureResponse.Endpoint> endpoints = new ArrayList<>();
        if (payload == null) {
            return endpoints;
        }
        for (JsonNode item : payload.path("items")) {
            int readyAddressCount = 0;
            int notReadyAddressCount = 0;
            List<String> podTargets = new ArrayList<>();

            for (JsonNode subset : item.path("subsets")) {
                for (JsonNode address : subset.path("addresses")) {
                    readyAddressCount += 1;
                    String podName = address.path("targetRef").path("kind").asText("").equals("Pod")
                            ? address.path("targetRef").path("name").asText("")
                            : "";
                    if (!podName.isBlank() && !podTargets.contains(podName)) {
                        podTargets.add(podName);
                    }
                }
                for (JsonNode address : subset.path("notReadyAddresses")) {
                    notReadyAddressCount += 1;
                    String podName = address.path("targetRef").path("kind").asText("").equals("Pod")
                            ? address.path("targetRef").path("name").asText("")
                            : "";
                    if (!podName.isBlank() && !podTargets.contains(podName)) {
                        podTargets.add(podName);
                    }
                }
            }

            endpoints.add(new K8sInfrastructureResponse.Endpoint(
                    item.path("metadata").path("namespace").asText("default"),
                    item.path("metadata").path("name").asText("-"),
                    readyAddressCount,
                    notReadyAddressCount,
                    podTargets
            ));
        }
        endpoints.sort(Comparator.comparing(K8sInfrastructureResponse.Endpoint::namespace)
                .thenComparing(K8sInfrastructureResponse.Endpoint::name));
        return endpoints;
    }

    private List<K8sInfrastructureResponse.NamespaceSummary> summarizeNamespaces(
            JsonNode namespacesPayload,
            List<K8sInfrastructureResponse.Pod> pods,
            List<K8sInfrastructureResponse.Service> services,
            List<K8sInfrastructureResponse.Deployment> deployments
    ) {
        Map<String, int[]> counts = new LinkedHashMap<>();
        if (namespacesPayload != null) {
            for (JsonNode item : namespacesPayload.path("items")) {
                counts.put(item.path("metadata").path("name").asText("default"), new int[3]);
            }
        }

        for (K8sInfrastructureResponse.Pod pod : pods) {
            counts.computeIfAbsent(pod.namespace(), key -> new int[3])[0] += 1;
        }
        for (K8sInfrastructureResponse.Service service : services) {
            counts.computeIfAbsent(service.namespace(), key -> new int[3])[1] += 1;
        }
        for (K8sInfrastructureResponse.Deployment deployment : deployments) {
            counts.computeIfAbsent(deployment.namespace(), key -> new int[3])[2] += 1;
        }

        List<K8sInfrastructureResponse.NamespaceSummary> summaries = new ArrayList<>();
        counts.forEach((namespace, value) -> summaries.add(
                new K8sInfrastructureResponse.NamespaceSummary(namespace, value[0], value[1], value[2])
        ));
        summaries.sort(Comparator.comparing(K8sInfrastructureResponse.NamespaceSummary::name));
        return summaries;
    }

    private void collectWarning(List<String> warnings, EndpointPayload payload) {
        if (payload.error() != null) {
            warnings.add(payload.path() + " 실패: " + payload.error());
        }
    }

    private List<String> readStringList(JsonNode arrayNode, String fieldName) {
        List<String> values = new ArrayList<>();
        for (JsonNode item : arrayNode) {
            String value = item.path(fieldName).asText("");
            if (!value.isBlank()) {
                values.add(value);
            }
        }
        return values;
    }

    private Map<String, String> readStringMap(JsonNode objectNode) {
        Map<String, String> values = new HashMap<>();
        if (!objectNode.isObject()) {
            return values;
        }

        Iterator<Map.Entry<String, JsonNode>> fields = objectNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            values.put(entry.getKey(), entry.getValue().asText(""));
        }
        return values;
    }

    private String readOwnerName(JsonNode ownerReferencesNode) {
        if (!ownerReferencesNode.isArray()) {
            return "-";
        }
        for (JsonNode owner : ownerReferencesNode) {
            if (owner.path("controller").asBoolean(false)) {
                return owner.path("name").asText("-");
            }
        }
        JsonNode first = ownerReferencesNode.path(0);
        return first.path("name").asText("-");
    }

    private String readOwnerKind(JsonNode ownerReferencesNode) {
        if (!ownerReferencesNode.isArray()) {
            return "-";
        }
        for (JsonNode owner : ownerReferencesNode) {
            if (owner.path("controller").asBoolean(false)) {
                return owner.path("kind").asText("-");
            }
        }
        JsonNode first = ownerReferencesNode.path(0);
        return first.path("kind").asText("-");
    }

    private record EndpointPayload(String path, JsonNode payload, String error) {
    }
}
