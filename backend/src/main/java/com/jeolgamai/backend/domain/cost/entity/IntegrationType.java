package com.jeolgamai.backend.domain.cost.entity;

import java.util.Arrays;

public enum IntegrationType {
    AWS("aws", "amazon-web-services"),
    KUBERNETES("kubernetes", "k8s"),
    PROMETHEUS("prometheus", "prom");

    private final String serviceName;
    private final String alias;

    IntegrationType(String serviceName, String alias) {
        this.serviceName = serviceName;
        this.alias = alias;
    }

    public String getServiceName() {
        return serviceName;
    }

    public static IntegrationType from(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Integration name is required");
        }

        String normalized = value.trim().toLowerCase();

        return Arrays.stream(values())
                .filter(type -> type.name().toLowerCase().equals(normalized)
                        || type.serviceName.equals(normalized)
                        || type.alias.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported integration: " + value));
    }
}
