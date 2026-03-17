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
        name = "optimization_approval_logs",
        indexes = {
                @Index(name = "idx_opt_approval_workspace_created", columnList = "workspace_id, created_at"),
                @Index(name = "idx_opt_approval_recommendation", columnList = "recommendation_id")
        }
)
public class OptimizationApprovalLogRecord {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "workspace_id", nullable = false, length = 191)
    private String workspaceId;

    @Column(name = "recommendation_id", nullable = false, length = 64)
    private String recommendationId;

    @Column(name = "actor", nullable = false, length = 191)
    private String actor;

    @Column(name = "action", nullable = false, length = 32)
    private String action;

    @Column(name = "note_text", nullable = false, columnDefinition = "LONGTEXT")
    private String note;

    @Column(name = "created_at", nullable = false, length = 64)
    private String createdAt;
}
