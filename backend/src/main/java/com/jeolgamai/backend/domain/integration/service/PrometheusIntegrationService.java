package com.jeolgamai.backend.domain.integration.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeolgamai.backend.domain.integration.dto.PrometheusCapacitySnapshot;
import com.jeolgamai.backend.domain.integration.dto.PrometheusOverviewResponse;
import com.jeolgamai.backend.domain.integration.dto.PrometheusValidationRequest;
import com.jeolgamai.backend.domain.integration.dto.PrometheusValidationResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.OptionalDouble;

@Service("backendPrometheusIntegrationService")
public class PrometheusIntegrationService {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);
    private static final Duration RANGE_WINDOW = Duration.ofHours(24);
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Seoul");
    private static final Duration MAX_LOOKBACK = Duration.ofDays(90);
    private static final DateTimeFormatter SHORT_LABEL_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DEFAULT_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MM/dd HH'h'");
    private static final DateTimeFormatter LONG_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MM/dd");
    private static final String CPU_USAGE_QUERY =
            "avg(100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m]))))";
    private static final String MEMORY_USAGE_QUERY =
            "avg(100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)))";
    private static final String SCRAPE_HEALTH_QUERY = "100 * avg(up)";
    private static final List<QueryCandidate> UP_QUERIES = List.of(
            new QueryCandidate("up", "up")
    );
    private static final List<QueryCandidate> CPU_USAGE_QUERIES = List.of(
            new QueryCandidate("node_cpu_seconds_total", CPU_USAGE_QUERY)
    );
    private static final List<QueryCandidate> MEMORY_USAGE_QUERIES = List.of(
            new QueryCandidate("node_memory", MEMORY_USAGE_QUERY)
    );
    private static final List<QueryCandidate> NODE_COUNT_QUERIES = List.of(
            new QueryCandidate("kube_node_info", "count(kube_node_info)"),
            new QueryCandidate(
                    "kube_node_status_capacity_cpu",
                    "count(kube_node_status_capacity{resource=\"cpu\",unit=\"core\"})"
            ),
            new QueryCandidate("machine_cpu_cores", "count(machine_cpu_cores)")
    );
    private static final List<QueryCandidate> TOTAL_CPU_CAPACITY_QUERIES = List.of(
            new QueryCandidate(
                    "kube_node_status_capacity_cpu",
                    "sum(kube_node_status_capacity{resource=\"cpu\",unit=\"core\"})"
            ),
            new QueryCandidate("machine_cpu_cores", "sum(machine_cpu_cores)")
    );
    private static final List<QueryCandidate> TOTAL_MEMORY_CAPACITY_QUERIES = List.of(
            new QueryCandidate(
                    "kube_node_status_capacity_memory",
                    "sum(kube_node_status_capacity{resource=\"memory\",unit=\"byte\"})"
            ),
            new QueryCandidate("machine_memory_bytes", "sum(machine_memory_bytes)")
    );
    private static final List<QueryCandidate> PVC_STORAGE_QUERIES = List.of(
            new QueryCandidate("kubelet_volume_stats_capacity_bytes", "sum(kubelet_volume_stats_capacity_bytes)"),
            new QueryCandidate(
                    "node_filesystem_size_bytes",
                    "sum(node_filesystem_size_bytes{fstype!=\"tmpfs\",mountpoint=\"/\"})"
            )
    );
    private static final List<QueryCandidate> POD_COUNT_QUERIES = List.of(
            new QueryCandidate("kube_pod_info", "count(kube_pod_info)")
    );
    private static final List<QueryCandidate> CPU_REQUEST_QUERIES = List.of(
            new QueryCandidate(
                    "kube_pod_container_resource_requests_cpu",
                    "sum(kube_pod_container_resource_requests{resource=\"cpu\",unit=\"core\"})"
            )
    );
    private static final List<QueryCandidate> MEMORY_REQUEST_QUERIES = List.of(
            new QueryCandidate(
                    "kube_pod_container_resource_requests_memory",
                    "sum(kube_pod_container_resource_requests{resource=\"memory\",unit=\"byte\"})"
            )
    );
    private static final List<QueryCandidate> ERROR_RATE_QUERIES = List.of(
            new QueryCandidate("probe_success", "100 * (1 - avg(probe_success))"),
            new QueryCandidate(
                    "prometheus_http_requests_total",
                    "100 * ((sum(rate(prometheus_http_requests_total{code=~\"5..\"}[5m])) or vector(0))"
                            + " / clamp_min(sum(rate(prometheus_http_requests_total[5m])), 0.000001))"
            ),
            new QueryCandidate(
                    "http_requests_total",
                    "100 * ((sum(rate(http_requests_total{status=~\"5..\"}[5m])) or vector(0))"
                            + " / clamp_min(sum(rate(http_requests_total[5m])), 0.000001))"
            ),
            new QueryCandidate(
                    "http_server_requests_seconds_count",
                    "100 * ((sum(rate(http_server_requests_seconds_count{status=~\"5..\"}[5m])) or vector(0))"
                            + " / clamp_min(sum(rate(http_server_requests_seconds_count[5m])), 0.000001))"
            ),
            new QueryCandidate(
                    "apiserver_request_total",
                    "100 * ((sum(rate(apiserver_request_total{code=~\"5..\"}[5m])) or vector(0))"
                            + " / clamp_min(sum(rate(apiserver_request_total[5m])), 0.000001))"
            )
    );
    private static final List<QueryCandidate> LATENCY_QUERIES = List.of(
            new QueryCandidate("probe_duration_seconds", "1000 * quantile(0.95, probe_duration_seconds)"),
            new QueryCandidate(
                    "probe_http_duration_seconds_bucket",
                    "1000 * histogram_quantile(0.95, sum(rate(probe_http_duration_seconds_bucket[5m])) by (le))"
            ),
            new QueryCandidate(
                    "prometheus_http_request_duration_seconds_bucket",
                    "1000 * histogram_quantile(0.95, sum(rate(prometheus_http_request_duration_seconds_bucket[5m])) by (le))"
            ),
            new QueryCandidate(
                    "http_request_duration_seconds_bucket",
                    "1000 * histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
            ),
            new QueryCandidate(
                    "http_server_requests_seconds_bucket",
                    "1000 * histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))"
            )
    );
    private static final List<ValidationTarget> VALIDATION_QUERIES = List.of(
            new ValidationTarget("up_query", UP_QUERIES),
            new ValidationTarget("cpu_usage", CPU_USAGE_QUERIES),
            new ValidationTarget("memory_usage", MEMORY_USAGE_QUERIES),
            new ValidationTarget("error_rate", ERROR_RATE_QUERIES),
            new ValidationTarget("latency", LATENCY_QUERIES)
    );

    private final ConnectorRegistryService connectorRegistryService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean allowLoopback;

    public PrometheusIntegrationService(
            ConnectorRegistryService connectorRegistryService,
            ObjectMapper objectMapper,
            @Value("${connector.allow-loopback:false}") boolean allowLoopback
    ) {
        this.connectorRegistryService = connectorRegistryService;
        this.objectMapper = objectMapper;
        this.allowLoopback = allowLoopback;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    public PrometheusValidationResponse validate(PrometheusValidationRequest request) {
        ConnectorRegistryService.PrometheusConnectorConfig connector = buildConnectorConfig(request);
        List<PrometheusValidationResponse.Check> checks = new ArrayList<>();

        for (ValidationTarget validationTarget : VALIDATION_QUERIES) {
            checks.add(runValidationCheck(connector, validationTarget));
        }

        long passedCount = checks.stream().filter(PrometheusValidationResponse.Check::passed).count();
        String status = passedCount == checks.size()
                ? "active"
                : passedCount >= 2
                ? "partial"
                : "failed";

        if (passedCount > 0) {
            connectorRegistryService.savePrometheusConnector(connector);
        }

        return new PrometheusValidationResponse("live", status, checks);
    }

    public PrometheusOverviewResponse getOverview(String workspaceId) {
        return getOverview(workspaceId, null, null);
    }

    public PrometheusCapacitySnapshot getCapacitySnapshot(String workspaceId) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        ConnectorRegistryService.PrometheusConnectorConfig connector = connectorRegistryService
                .getPrometheusConnector(normalizedWorkspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Prometheus connector가 backend에 등록되어 있지 않습니다."));

        return new PrometheusCapacitySnapshot(
                (int) Math.round(queryCapacityMetric(connector, NODE_COUNT_QUERIES)),
                queryCapacityMetric(connector, TOTAL_CPU_CAPACITY_QUERIES),
                queryCapacityMetric(connector, TOTAL_MEMORY_CAPACITY_QUERIES),
                queryCapacityMetric(connector, PVC_STORAGE_QUERIES),
                (int) Math.round(queryCapacityMetric(connector, POD_COUNT_QUERIES)),
                queryCapacityMetric(connector, CPU_REQUEST_QUERIES),
                queryCapacityMetric(connector, MEMORY_REQUEST_QUERIES)
        );
    }

    public PrometheusOverviewResponse getOverview(String workspaceId, String from, String to) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        ConnectorRegistryService.PrometheusConnectorConfig connector = connectorRegistryService
                .getPrometheusConnector(normalizedWorkspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Prometheus connector가 backend에 등록되어 있지 않습니다."));
        PrometheusRange range = resolveRange(from, to);

        List<String> warnings = new ArrayList<>();

        List<PrometheusOverviewResponse.Point> cpuUsage = queryRangeSeries(
                connector,
                CPU_USAGE_QUERIES,
                "cpu_usage",
                range,
                warnings
        );
        List<PrometheusOverviewResponse.Point> memoryUsage = queryRangeSeries(
                connector,
                MEMORY_USAGE_QUERIES,
                "memory_usage",
                range,
                warnings
        );
        List<PrometheusOverviewResponse.Point> latencyMs = queryRangeSeries(
                connector,
                LATENCY_QUERIES,
                "latency",
                range,
                warnings
        );
        List<PrometheusOverviewResponse.Point> errorRate = queryRangeSeries(
                connector,
                ERROR_RATE_QUERIES,
                "error_rate",
                range,
                warnings
        );

        double cpuUsagePercent = averageSeries(cpuUsage)
                .orElseGet(() -> queryInstantValue(connector, CPU_USAGE_QUERIES, "cpu_usage", range, warnings));
        double memoryUsagePercent = averageSeries(memoryUsage)
                .orElseGet(() -> queryInstantValue(connector, MEMORY_USAGE_QUERIES, "memory_usage", range, warnings));
        double p95LatencyMs = queryInstantValue(connector, LATENCY_QUERIES, "latency", range, warnings);
        double errorRatePercent = queryInstantValue(connector, ERROR_RATE_QUERIES, "error_rate", range, warnings);
        double scrapeHealthPercent = queryInstantValue(
                connector,
                List.of(new QueryCandidate("up", SCRAPE_HEALTH_QUERY)),
                "scrape_health",
                range,
                warnings
        );

        return new PrometheusOverviewResponse(
                "live",
                normalizedWorkspaceId,
                connector.baseUrl(),
                connector.authMode(),
                new PrometheusOverviewResponse.Summary(
                        round(cpuUsagePercent),
                        round(memoryUsagePercent),
                        round(p95LatencyMs),
                        round(errorRatePercent),
                        round(scrapeHealthPercent)
                ),
                new PrometheusOverviewResponse.Series(
                        cpuUsage,
                        memoryUsage,
                        latencyMs,
                        errorRate
                ),
                new PrometheusOverviewResponse.TimeRange(
                        range.from().toString(),
                        range.to().toString(),
                        range.stepSeconds()
                ),
                warnings
        );
    }

    private PrometheusValidationResponse.Check runValidationCheck(
            ConnectorRegistryService.PrometheusConnectorConfig connector,
            ValidationTarget validationTarget
    ) {
        for (QueryCandidate queryCandidate : validationTarget.candidates()) {
            try {
                JsonNode payload = executeInstantQuery(connector, queryCandidate.query());
                if (countResults(payload) > 0) {
                    return new PrometheusValidationResponse.Check(
                            validationTarget.key(),
                            true,
                            validationTarget.key() + " 쿼리 성공"
                    );
                }
            } catch (IllegalArgumentException ignored) {
                // Try the next candidate.
            }
        }

        return new PrometheusValidationResponse.Check(
                validationTarget.key(),
                false,
                validationTarget.key() + " 쿼리 결과가 비어 있습니다."
        );
    }

    private double queryInstantValue(
            ConnectorRegistryService.PrometheusConnectorConfig connector,
            List<QueryCandidate> queries,
            String metricKey,
            PrometheusRange range,
            List<String> warnings
    ) {
        IllegalArgumentException lastException = null;
        for (QueryCandidate queryCandidate : queries) {
            try {
                JsonNode payload = executeInstantQuery(connector, queryCandidate.query(), range.to());
                OptionalDouble value = parseInstantValue(payload);
                if (value.isPresent()) {
                    return value.getAsDouble();
                }
            } catch (IllegalArgumentException exception) {
                lastException = exception;
            }
        }
        if (lastException != null) {
            warnings.add(metricKey + " 조회 실패: " + safeErrorMessage(lastException));
        } else {
            warnings.add(metricKey + " metric 결과가 비어 있습니다.");
        }
        return 0;
    }

    private double queryCapacityMetric(
            ConnectorRegistryService.PrometheusConnectorConfig connector,
            List<QueryCandidate> queries
    ) {
        for (QueryCandidate queryCandidate : queries) {
            try {
                JsonNode payload = executeInstantQuery(connector, queryCandidate.query(), Instant.now());
                OptionalDouble value = parseInstantValue(payload);
                if (value.isPresent()) {
                    return value.getAsDouble();
                }
            } catch (IllegalArgumentException ignored) {
                // try next candidate
            }
        }
        return 0;
    }

    private List<PrometheusOverviewResponse.Point> queryRangeSeries(
            ConnectorRegistryService.PrometheusConnectorConfig connector,
            List<QueryCandidate> queries,
            String metricKey,
            PrometheusRange range,
            List<String> warnings
    ) {
        IllegalArgumentException lastException = null;
        for (QueryCandidate queryCandidate : queries) {
            try {
                JsonNode payload = executeRangeQuery(connector, queryCandidate.query(), range);
                List<PrometheusOverviewResponse.Point> points = parseRangePoints(payload, range);
                if (!points.isEmpty()) {
                    return points;
                }
            } catch (IllegalArgumentException exception) {
                lastException = exception;
            }
        }
        if (lastException != null) {
            warnings.add(metricKey + " 시계열 조회 실패: " + safeErrorMessage(lastException));
        } else {
            warnings.add(metricKey + " 시계열 결과가 비어 있습니다.");
        }
        return List.of();
    }

    private JsonNode executeInstantQuery(
            ConnectorRegistryService.PrometheusConnectorConfig connector,
            String query
    ) {
        return executeInstantQuery(connector, query, Instant.now());
    }

    private JsonNode executeInstantQuery(
            ConnectorRegistryService.PrometheusConnectorConfig connector,
            String query,
            Instant at
    ) {
        URI uri = URI.create(
                connector.baseUrl()
                        + "/api/v1/query?query="
                        + URLEncoder.encode(query, StandardCharsets.UTF_8)
                        + "&time=" + at.getEpochSecond()
        );
        return executeJsonRequest(connector, uri);
    }

    private JsonNode executeRangeQuery(
            ConnectorRegistryService.PrometheusConnectorConfig connector,
            String query,
            PrometheusRange range
    ) {
        URI uri = URI.create(
                connector.baseUrl()
                        + "/api/v1/query_range?query="
                        + URLEncoder.encode(query, StandardCharsets.UTF_8)
                        + "&start=" + range.from().getEpochSecond()
                        + "&end=" + range.to().getEpochSecond()
                        + "&step=" + range.stepSeconds()
        );
        return executeJsonRequest(connector, uri);
    }

    private JsonNode executeJsonRequest(
            ConnectorRegistryService.PrometheusConnectorConfig connector,
            URI uri
    ) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", buildAuthorizationHeader(connector))
                .header("Accept", "application/json")
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < HttpURLConnection.HTTP_OK
                    || response.statusCode() >= HttpURLConnection.HTTP_MULT_CHOICE) {
                throw new IllegalArgumentException("Prometheus 응답코드 " + response.statusCode());
            }

            JsonNode payload = objectMapper.readTree(response.body());
            if (!"success".equalsIgnoreCase(payload.path("status").asText())) {
                throw new IllegalArgumentException("Prometheus query status=" + payload.path("status").asText("unknown"));
            }
            return payload;
        } catch (IOException exception) {
            throw new IllegalArgumentException(exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalArgumentException("Prometheus API 요청이 중단되었습니다.");
        }
    }

    private OptionalDouble parseInstantValue(JsonNode payload) {
        JsonNode data = payload.path("data");
        String resultType = data.path("resultType").asText("");

        if ("scalar".equals(resultType)) {
            JsonNode valueNode = data.path("result");
            if (valueNode.isArray() && valueNode.size() >= 2) {
                return parseNumericNode(valueNode.get(1).asText());
            }
            return OptionalDouble.empty();
        }

        if (!"vector".equals(resultType)) {
            return OptionalDouble.empty();
        }

        JsonNode result = data.path("result");
        if (!result.isArray() || result.isEmpty()) {
            return OptionalDouble.empty();
        }

        double total = 0;
        int count = 0;
        for (JsonNode item : result) {
            JsonNode valueNode = item.path("value");
            if (!valueNode.isArray() || valueNode.size() < 2) {
                continue;
            }
            OptionalDouble value = parseNumericNode(valueNode.get(1).asText());
            if (value.isPresent()) {
                total += value.getAsDouble();
                count += 1;
            }
        }

        return count == 0 ? OptionalDouble.empty() : OptionalDouble.of(total / count);
    }

    private List<PrometheusOverviewResponse.Point> parseRangePoints(JsonNode payload, PrometheusRange range) {
        JsonNode data = payload.path("data");
        if (!"matrix".equals(data.path("resultType").asText(""))) {
            return List.of();
        }

        Map<Long, double[]> valuesByTimestamp = new LinkedHashMap<>();
        for (JsonNode series : data.path("result")) {
            for (JsonNode valueNode : series.path("values")) {
                if (!valueNode.isArray() || valueNode.size() < 2) {
                    continue;
                }

                long timestamp = valueNode.get(0).asLong();
                OptionalDouble value = parseNumericNode(valueNode.get(1).asText());
                if (value.isEmpty()) {
                    continue;
                }

                double[] aggregate = valuesByTimestamp.computeIfAbsent(timestamp, key -> new double[2]);
                aggregate[0] += value.getAsDouble();
                aggregate[1] += 1;
            }
        }

        List<PrometheusOverviewResponse.Point> points = new ArrayList<>();
        DateTimeFormatter labelFormatter = selectLabelFormatter(range);
        valuesByTimestamp.forEach((timestamp, aggregate) -> {
            if (aggregate[1] <= 0) {
                return;
            }

            String label = labelFormatter.format(
                    Instant.ofEpochSecond(timestamp).atZone(DISPLAY_ZONE).toLocalDateTime()
            );
            points.add(new PrometheusOverviewResponse.Point(label, round(aggregate[0] / aggregate[1])));
        });
        return points;
    }

    private OptionalDouble averageSeries(List<PrometheusOverviewResponse.Point> points) {
        if (points == null || points.isEmpty()) {
            return OptionalDouble.empty();
        }

        return points.stream()
                .mapToDouble(PrometheusOverviewResponse.Point::value)
                .average();
    }

    private int countResults(JsonNode payload) {
        JsonNode result = payload.path("data").path("result");
        return result.isArray() ? result.size() : 0;
    }

    private OptionalDouble parseNumericNode(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return OptionalDouble.empty();
        }

        try {
            return OptionalDouble.of(Double.parseDouble(rawValue));
        } catch (NumberFormatException exception) {
            return OptionalDouble.empty();
        }
    }

    private ConnectorRegistryService.PrometheusConnectorConfig buildConnectorConfig(PrometheusValidationRequest request) {
        String workspaceId = requireWorkspaceId(request.getWorkspaceId());
        String baseUrl = normalizeBaseUrl(request.getBaseUrl());
        String authMode = normalizeAuthMode(request.getAuthMode());
        String username = trimToNull(request.getUsername());
        String password = trimToNull(request.getPassword());
        String token = trimToNull(request.getToken());

        if ("basic".equals(authMode)) {
            if (username == null || password == null) {
                throw new IllegalArgumentException("basic 인증은 username과 password가 필요합니다.");
            }
            return new ConnectorRegistryService.PrometheusConnectorConfig(
                    workspaceId,
                    baseUrl,
                    authMode,
                    username,
                    password,
                    null
            );
        }

        if (token == null) {
            throw new IllegalArgumentException("bearer 인증은 token이 필요합니다.");
        }

        return new ConnectorRegistryService.PrometheusConnectorConfig(
                workspaceId,
                baseUrl,
                authMode,
                null,
                null,
                token
        );
    }

    private String buildAuthorizationHeader(ConnectorRegistryService.PrometheusConnectorConfig connector) {
        if ("basic".equals(connector.authMode())) {
            String credentials = connector.username() + ":" + connector.password();
            return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        }
        return "Bearer " + connector.token();
    }

    private String requireWorkspaceId(String workspaceId) {
        String normalized = trimToNull(workspaceId);
        if (normalized == null) {
            throw new IllegalArgumentException("workspaceId는 필수입니다.");
        }
        return normalized;
    }

    private String normalizeAuthMode(String authMode) {
        String normalized = trimToNull(authMode);
        if (normalized == null) {
            throw new IllegalArgumentException("authMode는 필수입니다.");
        }

        String lowered = normalized.toLowerCase(Locale.ROOT);
        if (!"basic".equals(lowered) && !"bearer".equals(lowered)) {
            throw new IllegalArgumentException("authMode는 basic 또는 bearer만 허용합니다.");
        }
        return lowered;
    }

    private String normalizeBaseUrl(String rawUrl) {
        String trimmed = rawUrl == null ? "" : rawUrl.trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("baseUrl은 비어 있을 수 없습니다.");
        }

        URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("baseUrl 형식이 올바르지 않습니다.");
        }

        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("baseUrl은 http 또는 https만 허용합니다.");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("baseUrl host를 확인할 수 없습니다.");
        }

        if (!allowLoopback && isBlockedHost(host)) {
            throw new IllegalArgumentException("보안상 loopback 또는 metadata endpoint는 허용되지 않습니다.");
        }

        return trimmed.replaceAll("/+$", "");
    }

    private PrometheusRange resolveRange(String from, String to) {
        Instant now = Instant.now();
        Instant resolvedTo = parseInstantOrDefault(to, now);
        if (resolvedTo.isAfter(now)) {
            resolvedTo = now;
        }

        Instant resolvedFrom = parseInstantOrDefault(from, resolvedTo.minus(RANGE_WINDOW));
        if (!resolvedFrom.isBefore(resolvedTo)) {
            throw new IllegalArgumentException("from은 to보다 이전 시각이어야 합니다.");
        }

        Duration duration = Duration.between(resolvedFrom, resolvedTo);
        if (duration.compareTo(MAX_LOOKBACK) > 0) {
            throw new IllegalArgumentException("조회 기간은 최대 90일까지만 허용합니다.");
        }

        return new PrometheusRange(resolvedFrom, resolvedTo, selectStepSeconds(duration));
    }

    private Instant parseInstantOrDefault(String rawValue, Instant defaultValue) {
        String normalized = trimToNull(rawValue);
        if (normalized == null) {
            return defaultValue;
        }

        try {
            return Instant.parse(normalized);
        } catch (Exception exception) {
            throw new IllegalArgumentException("기간 파라미터는 ISO-8601 UTC 형식이어야 합니다.");
        }
    }

    private long selectStepSeconds(Duration duration) {
        if (duration.compareTo(Duration.ofHours(12)) <= 0) {
            return Duration.ofMinutes(30).toSeconds();
        }
        if (duration.compareTo(Duration.ofDays(2)) <= 0) {
            return Duration.ofHours(2).toSeconds();
        }
        if (duration.compareTo(Duration.ofDays(8)) <= 0) {
            return Duration.ofHours(12).toSeconds();
        }
        if (duration.compareTo(Duration.ofDays(31)) <= 0) {
            return Duration.ofDays(1).toSeconds();
        }
        return Duration.ofDays(7).toSeconds();
    }

    private DateTimeFormatter selectLabelFormatter(PrometheusRange range) {
        Duration duration = Duration.between(range.from(), range.to());
        if (duration.compareTo(Duration.ofHours(12)) <= 0) {
            return SHORT_LABEL_FORMATTER;
        }
        if (duration.compareTo(Duration.ofDays(8)) <= 0) {
            return DEFAULT_LABEL_FORMATTER;
        }
        return LONG_LABEL_FORMATTER;
    }

    private boolean isBlockedHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        return normalized.equals("localhost")
                || normalized.equals("0.0.0.0")
                || normalized.equals("::1")
                || normalized.startsWith("127.")
                || normalized.equals("169.254.169.254")
                || normalized.equals("169.254.170.2");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String safeErrorMessage(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return message;
    }

    private record ValidationTarget(String key, List<QueryCandidate> candidates) {
    }

    private record QueryCandidate(String key, String query) {
    }

    private record PrometheusRange(
            Instant from,
            Instant to,
            long stepSeconds
    ) {
    }
}
