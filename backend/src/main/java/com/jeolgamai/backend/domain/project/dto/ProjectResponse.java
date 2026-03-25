package com.jeolgamai.backend.domain.project.dto;

public record ProjectResponse(
        String id,
        String name,
        String ownerUserId,
        String awsRegion,
        String createdAt
) {
}
