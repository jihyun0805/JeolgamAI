package com.jeolgamai.backend.domain.integration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeolgamai.backend.domain.integration.dto.PrometheusOverviewResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiMetricForecastClient {

    private final ObjectMapper objectMapper;

    @Value("${forecast.ai.enabled:true}")
    private boolean enabled;

    @Value("${forecast.ai.base-url:http://127.0.0.1:8000}")
    private String baseUrl;

    @Value("${forecast.ai.timeout-seconds:8}")
    private long timeoutSeconds;

    public PrometheusOverviewResponse.AiForecast forecast(
            String workspaceId,
            String from,
            String to,
            long stepSeconds,
            List<MetricSeriesRequest> metrics
    ) {
        if (!enabled || metrics == null || metrics.isEmpty()) {
            return null;
        }

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.max(1, timeoutSeconds)))
                .build();

        ForecastRequest requestBody = new ForecastRequest(workspaceId, from, to, stepSeconds, metrics);
        try {
            String payload = objectMapper.writeValueAsString(requestBody);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/v1/forecast/metrics"))
                    .timeout(Duration.ofSeconds(Math.max(1, timeoutSeconds)))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("AI forecast service 응답코드 " + response.statusCode());
            }

            ForecastResponse forecast = objectMapper.readValue(response.body(), ForecastResponse.class);
            return new PrometheusOverviewResponse.AiForecast(
                    forecast.methodology(),
                    "fastapi",
                    forecast.metrics().stream()
                            .map(metric -> new PrometheusOverviewResponse.AiForecastMetric(
                                    metric.key(),
                                    metric.label(),
                                    metric.unit(),
                                    metric.strategy(),
                                    metric.currentValue(),
                                    new PrometheusOverviewResponse.RangeValue(
                                            metric.forecast1h().lower(),
                                            metric.forecast1h().base(),
                                            metric.forecast1h().upper()
                                    ),
                                    new PrometheusOverviewResponse.RangeValue(
                                            metric.forecast6h().lower(),
                                            metric.forecast6h().base(),
                                            metric.forecast6h().upper()
                                    ),
                                    new PrometheusOverviewResponse.RangeValue(
                                            metric.forecast24h().lower(),
                                            metric.forecast24h().base(),
                                            metric.forecast24h().upper()
                                    )
                            ))
                            .toList(),
                    forecast.chartSeries().stream()
                            .map(series -> new PrometheusOverviewResponse.AiForecastSeries(
                                    series.key(),
                                    series.points().stream()
                                            .map(point -> new PrometheusOverviewResponse.BandPoint(
                                                    point.label(),
                                                    point.lower(),
                                                    point.base(),
                                                    point.upper()
                                            ))
                                            .toList()
                            ))
                            .toList()
            );
        } catch (IOException exception) {
            throw new IllegalStateException("AI forecast 응답 파싱 실패", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("AI forecast 요청이 중단되었습니다.", exception);
        }
    }

    public record ForecastRequest(
            String workspaceId,
            String from,
            String to,
            long stepSeconds,
            List<MetricSeriesRequest> metrics
    ) {
    }

    public record MetricSeriesRequest(
            String key,
            String label,
            String unit,
            List<MetricPointRequest> points
    ) {
    }

    public record MetricPointRequest(
            String timestamp,
            double value
    ) {
    }

    public record ForecastResponse(
            String methodology,
            List<ForecastMetricResponse> metrics,
            List<ForecastSeriesResponse> chartSeries
    ) {
    }

    public record ForecastMetricResponse(
            String key,
            String label,
            String unit,
            String strategy,
            double currentValue,
            ForecastRangeResponse forecast1h,
            ForecastRangeResponse forecast6h,
            ForecastRangeResponse forecast24h
    ) {
    }

    public record ForecastRangeResponse(
            double lower,
            double base,
            double upper
    ) {
    }

    public record ForecastSeriesResponse(
            String key,
            List<ForecastBandPointResponse> points
    ) {
    }

    public record ForecastBandPointResponse(
            String label,
            double lower,
            double base,
            double upper
    ) {
    }
}
