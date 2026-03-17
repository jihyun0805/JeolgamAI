package com.jeolgamai.backend.domain.integration.service;

import com.jeolgamai.backend.domain.integration.dto.K8sValidationCheckResponse;
import com.jeolgamai.backend.domain.integration.dto.K8sValidationRequest;
import com.jeolgamai.backend.domain.integration.dto.K8sValidationResponse;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

@Service
public class K8sValidationService {

    private static final List<EndpointCheck> ENDPOINTS = List.of(
            new EndpointCheck("cluster_api", "/api"),
            new EndpointCheck("nodes_list", "/api/v1/nodes?limit=1"),
            new EndpointCheck("namespaces_list", "/api/v1/namespaces?limit=1"),
            new EndpointCheck("pods_list", "/api/v1/pods?limit=1"),
            new EndpointCheck("services_list", "/api/v1/services?limit=1"),
            new EndpointCheck("deployments_list", "/apis/apps/v1/deployments?limit=1")
    );

    private final ConnectorRegistryService connectorRegistryService;
    private final K8sApiSupport k8sApiSupport;

    public K8sValidationService(
            ConnectorRegistryService connectorRegistryService,
            K8sApiSupport k8sApiSupport
    ) {
        this.connectorRegistryService = connectorRegistryService;
        this.k8sApiSupport = k8sApiSupport;
    }

    public K8sValidationResponse validate(K8sValidationRequest request) {
        String workspaceId = normalizeWorkspaceId(request.getWorkspaceId());
        String baseUrl = k8sApiSupport.normalizeApiServerUrl(request.getApiServerUrl());
        String token = k8sApiSupport.normalizeBearerToken(request.getToken());
        HttpClient httpClient = k8sApiSupport.buildHttpClient(request.getCaCertPem());
        List<K8sValidationCheckResponse> checks = new ArrayList<>();

        for (EndpointCheck endpoint : ENDPOINTS) {
            checks.add(callEndpoint(httpClient, baseUrl, token, endpoint));
        }

        long passedCount = checks.stream().filter(K8sValidationCheckResponse::isPassed).count();
        boolean clusterApiPassed = checks.stream()
                .anyMatch(check -> "cluster_api".equals(check.getKey()) && check.isPassed());
        String status;
        if (passedCount == checks.size()) {
            status = "active";
        } else if (clusterApiPassed && passedCount >= 2) {
            status = "partial";
        } else {
            status = "failed";
        }

        if (!"failed".equals(status)) {
            connectorRegistryService.saveK8sConnector(new ConnectorRegistryService.K8sConnectorConfig(
                    workspaceId,
                    baseUrl,
                    token,
                    request.getClusterName() == null || request.getClusterName().trim().isEmpty()
                            ? "Kubernetes Cluster"
                            : request.getClusterName().trim(),
                    request.getCaCertPem() == null ? null : request.getCaCertPem().trim()
            ));
        }

        return new K8sValidationResponse("live", status, checks);
    }

    private String normalizeWorkspaceId(String workspaceId) {
        if (workspaceId == null || workspaceId.trim().isEmpty()) {
            throw new IllegalArgumentException("workspaceId는 필수입니다.");
        }
        return workspaceId.trim();
    }

    private K8sValidationCheckResponse callEndpoint(
            HttpClient httpClient,
            String baseUrl,
            String token,
            EndpointCheck endpoint
    ) {
        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + endpoint.path()))
                .timeout(java.time.Duration.ofSeconds(8))
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/json")
                .GET()
                .build();

        try {
            HttpResponse<Void> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() >= 200
                    && response.statusCode() < 300) {
                return new K8sValidationCheckResponse(
                        endpoint.key(),
                        true,
                        endpoint.path() + " 조회 성공"
                );
            }

            return new K8sValidationCheckResponse(
                    endpoint.key(),
                    false,
                    k8sApiSupport.describeHttpStatus(endpoint.path(), response.statusCode())
            );
        } catch (IOException exception) {
            return new K8sValidationCheckResponse(
                    endpoint.key(),
                    false,
                    k8sApiSupport.describeConnectionFailure(exception)
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new K8sValidationCheckResponse(
                    endpoint.key(),
                    false,
                    "요청이 중단되었습니다."
            );
        }
    }

    private record EndpointCheck(String key, String path) {
    }
}
