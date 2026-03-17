package com.jeolgamai.backend.domain.optimization.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "optimization_chat_sessions",
        indexes = {
                @Index(name = "idx_opt_chat_sessions_workspace_analysis", columnList = "workspace_id, analysis_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class OptimizationChatSessionRecord {

    @Id
    @Column(name = "id", nullable = false, length = 190)
    private String id;

    @Column(name = "workspace_id", nullable = false, length = 120)
    private String workspaceId;

    @Column(name = "analysis_id", nullable = false, length = 120)
    private String analysisId;

    @Column(name = "pinned_recommendation_id", length = 120)
    private String pinnedRecommendationId;

    @Column(name = "updated_at", nullable = false, length = 40)
    private String updatedAt;
}
