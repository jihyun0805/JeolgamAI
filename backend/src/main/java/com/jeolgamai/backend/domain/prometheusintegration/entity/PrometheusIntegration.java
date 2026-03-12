package com.jeolgamai.backend.domain.prometheusintegration.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "prometheus_integrations")
public class PrometheusIntegration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100, unique = true)
    private String integrationName;

    @Column(nullable = false, length = 255)
    private String baseUrl;

    @Column(nullable = false, length = 4000)
    private String apiToken;

    @Column(nullable = false)
    private boolean includeLatencyQuery;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public PrometheusIntegration(
            String integrationName,
            String baseUrl,
            String apiToken,
            boolean includeLatencyQuery
    ) {
        this.integrationName = integrationName;
        this.baseUrl = baseUrl;
        this.apiToken = apiToken;
        this.includeLatencyQuery = includeLatencyQuery;
    }
}
