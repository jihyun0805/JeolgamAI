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
        name = "optimization_analyses",
        indexes = {
                @Index(name = "idx_opt_analyses_workspace_created", columnList = "workspace_id, created_at"),
                @Index(name = "idx_opt_analyses_project_id", columnList = "project_id")
        }
)
public class OptimizationAnalysisRecord {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "workspace_id", nullable = false, length = 191)
    private String workspaceId;

    @Column(name = "project_id", nullable = false, length = 191)
    private String projectId;

    @Column(name = "project_name", nullable = false, length = 191)
    private String projectName;

    @Column(name = "project_owner_user_id", nullable = false, length = 191)
    private String projectOwnerUserId;

    @Column(name = "project_created_at", nullable = false, length = 64)
    private String projectCreatedAt;

    @Column(name = "triggered_by", nullable = false, length = 32)
    private String triggeredBy;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "created_at", nullable = false, length = 64)
    private String createdAt;

    @Column(name = "started_at", nullable = false, length = 64)
    private String startedAt;

    @Column(name = "completed_at", nullable = false, length = 64)
    private String completedAt;

    @Column(name = "lookback_days", nullable = false)
    private int lookbackDays;

    @Column(name = "period_start", nullable = false, length = 64)
    private String periodStart;

    @Column(name = "period_end", nullable = false, length = 64)
    private String periodEnd;

    @Column(name = "aws_region", nullable = false, length = 32)
    private String awsRegion;

    @Column(name = "source_coverage_json", nullable = false, columnDefinition = "LONGTEXT")
    private String sourceCoverageJson;

    @Column(name = "total_monthly_cost", nullable = false)
    private long totalMonthlyCost;

    @Column(name = "waste_cost", nullable = false)
    private long wasteCost;

    @Column(name = "potential_monthly_saving", nullable = false)
    private long potentialMonthlySaving;

    @Column(name = "potential_annual_saving", nullable = false)
    private long potentialAnnualSaving;

    @Column(name = "score_json", nullable = false, columnDefinition = "LONGTEXT")
    private String scoreJson;

    @Column(name = "recommendation_ids_json", nullable = false, columnDefinition = "LONGTEXT")
    private String recommendationIdsJson;

    @Column(name = "resources_json", nullable = false, columnDefinition = "LONGTEXT")
    private String resourcesJson;

    @Column(name = "cost_breakdown_json", nullable = false, columnDefinition = "LONGTEXT")
    private String costBreakdownJson;

    @Column(name = "warnings_json", nullable = false, columnDefinition = "LONGTEXT")
    private String warningsJson;

    @Column(name = "executive_summary", columnDefinition = "LONGTEXT")
    private String executiveSummary;
}
