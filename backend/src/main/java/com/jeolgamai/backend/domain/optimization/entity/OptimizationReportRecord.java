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
        name = "optimization_reports",
        indexes = {
                @Index(name = "idx_opt_reports_workspace_created", columnList = "workspace_id, created_at"),
                @Index(name = "idx_opt_reports_workspace_analysis", columnList = "workspace_id, analysis_id")
        }
)
public class OptimizationReportRecord {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "workspace_id", nullable = false, length = 191)
    private String workspaceId;

    @Column(name = "analysis_id", nullable = false, length = 64)
    private String analysisId;

    @Column(name = "template_type", nullable = false, length = 32)
    private String templateType;

    @Column(name = "created_by", nullable = false, length = 191)
    private String createdBy;

    @Column(name = "created_at", nullable = false, length = 64)
    private String createdAt;

    @Column(name = "preview_url", nullable = false, length = 512)
    private String previewUrl;

    @Column(name = "export_url", nullable = false, length = 512)
    private String exportUrl;

    @Column(name = "payload_json", nullable = false, columnDefinition = "LONGTEXT")
    private String payloadJson;
}
