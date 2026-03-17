package com.jeolgamai.backend.domain.optimization.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class GmsLlmClient {

    private static final Logger log = LoggerFactory.getLogger(GmsLlmClient.class);
    private static final String DEFAULT_GMS_API_BASE_URL = "https://gms.ssafy.io/api/v1";
    private static final String DEFAULT_GMS_OPENAI_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String accessToken;
    private final String configuredApiKey;
    private final URI gmsKeyLookupUri;
    private final URI completionsUri;
    private final String model;
    private final double temperature;
    private final AtomicReference<String> cachedApiKey = new AtomicReference<>();

    public GmsLlmClient(
            ObjectMapper objectMapper,
            @Value("${optimization.ai.gms.access-token:${GMS_ACCESS_TOKEN:}}") String accessToken,
            @Value("${optimization.ai.gms.api-key:${GMS_API_KEY:}}") String configuredApiKey,
            @Value("${optimization.ai.gms.api-base-url:" + DEFAULT_GMS_API_BASE_URL + "}") String gmsApiBaseUrl,
            @Value("${optimization.ai.gms.openai-base-url:" + DEFAULT_GMS_OPENAI_BASE_URL + "}") String gmsOpenAiBaseUrl,
            @Value("${optimization.ai.gms.model:${GMS_OPENAI_CHAT_MODEL:gpt-4o}}") String model,
            @Value("${optimization.ai.gms.temperature:${OPENAI_CHAT_TEMPERATURE:0.2}}") double temperature,
            @Value("${optimization.ai.gms.timeout-seconds:30}") long timeoutSeconds
    ) {
        this.objectMapper = objectMapper;
        this.accessToken = trimToNull(accessToken);
        this.configuredApiKey = trimToNull(configuredApiKey);
        this.gmsKeyLookupUri = resolveUri(gmsApiBaseUrl, "/gms-keys/me");
        this.completionsUri = resolveUri(gmsOpenAiBaseUrl, "/chat/completions");
        this.model = trimToNull(model) == null ? "gpt-4o" : model.trim();
        this.temperature = temperature;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.max(5, timeoutSeconds)))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public Optional<String> complete(
            String workspaceId,
            String analysisId,
            String systemPrompt,
            String userPrompt
    ) {
        String apiKey = resolveApiKey();
        if (apiKey == null) {
            return Optional.empty();
        }

        try {
            JsonNode body = objectMapper.createObjectNode()
                    .put("model", model)
                    .put("temperature", temperature)
                    .set(
                            "messages",
                            objectMapper.createArrayNode()
                                    .add(objectMapper.createObjectNode()
                                            .put("role", "system")
                                            .put("content", systemPrompt))
                                    .add(objectMapper.createObjectNode()
                                            .put("role", "user")
                                            .put("content", userPrompt))
                    );

            HttpRequest request = HttpRequest.newBuilder(completionsUri)
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401 && configuredApiKey == null && accessToken != null) {
                cachedApiKey.set(null);
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn(
                        "GMS LLM 호출 실패. workspaceId={}, analysisId={}, status={}",
                        workspaceId,
                        analysisId,
                        response.statusCode()
                );
                return Optional.empty();
            }

            JsonNode payload = objectMapper.readTree(response.body());
            String content = payload.path("choices").path(0).path("message").path("content").asText(null);
            if (content == null || content.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(content.trim());
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn(
                    "GMS LLM 응답 생성 실패. workspaceId={}, analysisId={}, message={}",
                    workspaceId,
                    analysisId,
                    exception.getMessage()
            );
            return Optional.empty();
        }
    }

    private String resolveApiKey() {
        if (configuredApiKey != null) {
            return configuredApiKey;
        }

        String cached = cachedApiKey.get();
        if (cached != null) {
            return cached;
        }
        if (accessToken == null) {
            return null;
        }

        synchronized (cachedApiKey) {
            cached = cachedApiKey.get();
            if (cached != null) {
                return cached;
            }

            String fetched = fetchApiKeyFromGms().orElse(null);
            if (fetched != null) {
                cachedApiKey.set(fetched);
            }
            return fetched;
        }
    }

    private Optional<String> fetchApiKeyFromGms() {
        try {
            HttpRequest request = HttpRequest.newBuilder(gmsKeyLookupUri)
                    .header("Accept", "application/json")
                    .header("Cookie", "access_token=" + accessToken)
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("GMS key 조회 실패. status={}", response.statusCode());
                return Optional.empty();
            }

            JsonNode payload = objectMapper.readTree(response.body());
            if (!payload.path("isActive").asBoolean(false)) {
                log.warn("GMS key가 비활성 상태입니다.");
                return Optional.empty();
            }

            String keyValue = trimToNull(payload.path("keyValue").asText(null));
            return Optional.ofNullable(keyValue);
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn("GMS key 조회 실패. message={}", exception.getMessage());
            return Optional.empty();
        }
    }

    private URI resolveUri(String rawBaseUrl, String suffix) {
        String baseUrl = trimToNull(rawBaseUrl);
        if (baseUrl == null) {
            throw new IllegalArgumentException("GMS base URL이 비어 있습니다.");
        }

        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        if (normalizedBase.endsWith(suffix)) {
            return URI.create(normalizedBase);
        }
        return URI.create(normalizedBase + suffix);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
