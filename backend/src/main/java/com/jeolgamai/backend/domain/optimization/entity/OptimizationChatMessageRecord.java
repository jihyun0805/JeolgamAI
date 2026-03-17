package com.jeolgamai.backend.domain.optimization.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "optimization_chat_messages",
        indexes = {
                @Index(name = "idx_opt_chat_messages_session_seq", columnList = "session_id, sequence_no")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class OptimizationChatMessageRecord {

    @Id
    @Column(name = "id", nullable = false, length = 120)
    private String id;

    @Column(name = "session_id", nullable = false, length = 190)
    private String sessionId;

    @Column(name = "workspace_id", nullable = false, length = 120)
    private String workspaceId;

    @Column(name = "role", nullable = false, length = 20)
    private String role;

    @Lob
    @Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "created_at", nullable = false, length = 40)
    private String createdAt;

    @Column(name = "sequence_no", nullable = false)
    private Long sequenceNo;
}
