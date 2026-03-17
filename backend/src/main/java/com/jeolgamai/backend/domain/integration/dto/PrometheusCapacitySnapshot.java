package com.jeolgamai.backend.domain.integration.dto;

public record PrometheusCapacitySnapshot(
        int nodeCount,
        double totalCpuCores,
        double totalMemoryBytes,
        double pvcStorageBytes,
        int podCount,
        double requestedCpuCores,
        double requestedMemoryBytes
) {
}
