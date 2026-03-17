package com.jeolgamai.backend.domain.integration.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "integration_connectors",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_integration_connectors_workspace_type",
                columnNames = {"workspace_id", "connector_type"}
        )
)
public class IntegrationConnector {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false, length = 191)
    private String workspaceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "connector_type", nullable = false, length = 32)
    private ConnectorType connectorType;

    @Column(name = "encrypted_payload", nullable = false, columnDefinition = "LONGTEXT")
    private String encryptedPayload;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
