package com.jeolgamai.backend.domain.project.entity;

import com.jeolgamai.backend.domain.awsintegration.entity.AwsIntegration;
import com.jeolgamai.backend.domain.kubernetesintegration.entity.KubernetesIntegration;
import com.jeolgamai.backend.domain.prometheusintegration.entity.PrometheusIntegration;
import com.jeolgamai.backend.domain.user.entity.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String projectName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "aws_integration_id", nullable = false)
    private AwsIntegration awsIntegration;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prometheus_integration_id", nullable = false)
    private PrometheusIntegration prometheusIntegration;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "kubernetes_integration_id", nullable = false)
    private KubernetesIntegration kubernetesIntegration;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public Project(
            String projectName,
            UserAccount user,
            AwsIntegration awsIntegration,
            PrometheusIntegration prometheusIntegration,
            KubernetesIntegration kubernetesIntegration
    ) {
        this.projectName = projectName;
        this.user = user;
        this.awsIntegration = awsIntegration;
        this.prometheusIntegration = prometheusIntegration;
        this.kubernetesIntegration = kubernetesIntegration;
    }
}
