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
        name = "optimization_notifications",
        indexes = {
                @Index(name = "idx_opt_notifications_workspace_created", columnList = "workspace_id, created_at"),
                @Index(name = "idx_opt_notifications_workspace_read", columnList = "workspace_id, is_read")
        }
)
public class OptimizationNotificationRecord {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "workspace_id", nullable = false, length = 191)
    private String workspaceId;

    @Column(nullable = false, length = 32)
    private String severity;

    @Column(nullable = false, length = 191)
    private String title;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String body;

    @Column(name = "analysis_id", length = 64)
    private String analysisId;

    @Column(name = "report_id", length = 64)
    private String reportId;

    @Column(name = "created_at", nullable = false, length = 64)
    private String createdAt;

    @Column(name = "is_read", nullable = false)
    private boolean read;
}
