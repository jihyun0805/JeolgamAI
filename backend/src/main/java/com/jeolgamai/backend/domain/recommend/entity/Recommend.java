package com.jeolgamai.backend.domain.recommend.entity;

import com.jeolgamai.backend.domain.resource.entity.Resource;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(name = "recommendations")
public class Recommend {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    private double estimatedSavings;
    private double riskScore;
    private double feasibilityScore;
    private double priorityScore;
    private String status;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public Recommend(Resource resource, double estimatedSavings, double riskScore, double feasibilityScore, double priorityScore, String status) {
        this.resource = resource;
        this.estimatedSavings = estimatedSavings;
        this.riskScore = riskScore;
        this.feasibilityScore = feasibilityScore;
        this.priorityScore = priorityScore;
        this.status = status;
    }
}
