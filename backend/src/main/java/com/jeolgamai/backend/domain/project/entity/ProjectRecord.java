package com.jeolgamai.backend.domain.project.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
@Table(
        name = "projects",
        indexes = {
                @Index(name = "idx_projects_owner_created", columnList = "owner_user_id, created_at")
        }
)
public class ProjectRecord {

    @Id
    @Column(nullable = false, length = 191)
    private String id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(nullable = false, length = 191)
    private String name;

    @Column(name = "aws_region", nullable = false, length = 50)
    private String awsRegion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public ProjectRecord(String id, Long ownerUserId, String name, String awsRegion) {
        this.id = id;
        this.ownerUserId = ownerUserId;
        this.name = name;
        this.awsRegion = awsRegion;
    }
}
