package com.jeolgamai.backend.domain.awsintegration.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "aws_integrations")
public class AwsIntegration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100, unique = true)
    private String integrationName;

    @Column(nullable = false, length = 50)
    private String region;

    @Column(nullable = false, length = 50)
    private String authMethod;

    @Column(nullable = false, length = 255)
    private String roleArn;

    @Column(nullable = false, length = 255)
    private String externalId;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public AwsIntegration(
            String integrationName,
            String region,
            String authMethod,
            String roleArn,
            String externalId
    ) {
        this.integrationName = integrationName;
        this.region = region;
        this.authMethod = authMethod;
        this.roleArn = roleArn;
        this.externalId = externalId;
    }
}
