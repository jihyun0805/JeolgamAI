package com.jeolgamai.backend.domain.metric.entity;

import com.jeolgamai.backend.domain.resource.entity.Resource;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "metrics")
public class Metric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    private double cpuAvg;
    private double memoryAvg;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public Metric() {
    }

    public Metric(Resource resource, double cpuAvg, double memoryAvg) {
        this.resource = resource;
        this.cpuAvg = cpuAvg;
        this.memoryAvg = memoryAvg;
    }

    public Long getId() {
        return id;
    }

    public Resource getResource() {
        return resource;
    }

    public void setResource(Resource resource) {
        this.resource = resource;
    }

    public double getCpuAvg() {
        return cpuAvg;
    }

    public void setCpuAvg(double cpuAvg) {
        this.cpuAvg = cpuAvg;
    }

    public double getMemoryAvg() {
        return memoryAvg;
    }

    public void setMemoryAvg(double memoryAvg) {
        this.memoryAvg = memoryAvg;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
