package com.jeolgamai.backend.domain.optimization.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "optimization_recommendations",
        indexes = {
                @Index(name = "idx_opt_recommendations_analysis", columnList = "analysis_id"),
                @Index(name = "idx_opt_recommendations_workspace", columnList = "workspace_id")
        }
)
public class OptimizationRecommendationRecord {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "analysis_id", nullable = false, length = 64)
    private String analysisId;

    @Column(name = "workspace_id", nullable = false, length = 191)
    private String workspaceId;

    @Column(name = "domain_key", nullable = false, length = 64)
    private String domain;

    @Column(name = "title", nullable = false, length = 191)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "LONGTEXT")
    private String description;

    @Column(name = "target_resource", nullable = false, length = 191)
    private String targetResource;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "confidence_score", nullable = false)
    private double confidenceScore;

    @Column(name = "risk_level", nullable = false, length = 32)
    private String riskLevel;

    @Column(name = "est_monthly_saving", nullable = false)
    private long estMonthlySaving;

    @Column(name = "est_annual_saving", nullable = false)
    private long estAnnualSaving;

    @Column(name = "command_snippet", nullable = false, columnDefinition = "LONGTEXT")
    private String commandSnippet;

    @Column(name = "rollback_snippet", nullable = false, columnDefinition = "LONGTEXT")
    private String rollbackSnippet;

    @Column(name = "evidence_json", nullable = false, columnDefinition = "LONGTEXT")
    private String evidenceJson;

    @Column(name = "rule_trace_json", nullable = false, columnDefinition = "LONGTEXT")
    private String ruleTraceJson;

    @Column(name = "created_at", nullable = false, length = 64)
    private String createdAt;

    @Column(name = "updated_at", nullable = false, length = 64)
    private String updatedAt;

    @Column(name = "rationale", columnDefinition = "LONGTEXT")
    private String rationale;
}
