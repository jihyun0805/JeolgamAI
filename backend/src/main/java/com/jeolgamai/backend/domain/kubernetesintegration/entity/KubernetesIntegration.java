package com.jeolgamai.backend.domain.kubernetesintegration.entity;

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
@Table(name = "kubernetes_integrations")
public class KubernetesIntegration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100, unique = true)
    private String integrationName;

    @Column(nullable = false, length = 100)
    private String clusterName;

    @Column(nullable = false, length = 255)
    private String apiServerUrl;

    @Column(nullable = false, length = 4000)
    private String readOnlyToken;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public KubernetesIntegration(
            String integrationName,
            String clusterName,
            String apiServerUrl,
            String readOnlyToken
    ) {
        this.integrationName = integrationName;
        this.clusterName = clusterName;
        this.apiServerUrl = apiServerUrl;
        this.readOnlyToken = readOnlyToken;
    }
}
