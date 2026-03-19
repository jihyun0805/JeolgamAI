package com.jeolgamai.backend.domain.optimization.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class OptimizationModels {

    private OptimizationModels() {
    }

    public record ProjectSummary(
            String id,
            String name,
            String ownerUserId,
            String awsRegion,
            String createdAt
    ) {
    }

    public record SourceCoverage(
            boolean aws,
            boolean k8s,
            boolean prometheus
    ) {
    }

    public record MetricValue(
            String key,
            double value,
            String unit
    ) {
    }

    public record RecommendationEvidence(
            String summary,
            int lookbackDays,
            List<MetricValue> metrics
    ) {
    }

    public record RuleTrace(
            String ruleId,
            String principleName,
            String awsDocUrl,
            String ruleVersion
    ) {
    }

    public record Recommendation(
            String id,
            String analysisId,
            String workspaceId,
            String domain,
            String title,
            String description,
            String targetResource,
            String status,
            double confidenceScore,
            String riskLevel,
            long estMonthlySaving,
            long estAnnualSaving,
            String commandSnippet,
            String rollbackSnippet,
            RecommendationEvidence evidence,
            RuleTrace ruleTrace,
            String createdAt,
            String updatedAt,
            String rationale
    ) {
    }

    public record PillarScore(
            String pillarKey,
            String pillarName,
            int maxScore,
            int score,
            int deduction
    ) {
    }

    public record ScoreBreakdown(
            int totalScore,
            String grade,
            int confidencePercent,
            List<PillarScore> pillars
    ) {
    }

    public record InfrastructureResource(
            String id,
            String name,
            String type,
            String region,
            String status,
            Double cpuUsagePercent,
            Double memoryUsagePercent,
            long monthlyCost,
            String riskLevel
    ) {
    }

    public record CostBreakdownItem(
            String service,
            String usageType,
            long monthlyCost,
            String region,
            int resourceCount
    ) {
    }

    public record AnalysisSnapshot(
            String id,
            String workspaceId,
            String triggeredBy,
            String status,
            String createdAt,
            String startedAt,
            String completedAt,
            int lookbackDays,
            String periodStart,
            String periodEnd,
            String awsRegion,
            SourceCoverage sourceCoverage,
            long totalMonthlyCost,
            long wasteCost,
            long potentialMonthlySaving,
            long potentialAnnualSaving,
            ScoreBreakdown score,
            List<String> recommendationIds,
            List<InfrastructureResource> resources,
            List<CostBreakdownItem> costBreakdown,
            List<String> warnings,
            String executiveSummary
    ) {
    }

    public record ApprovalLog(
            String id,
            String workspaceId,
            String recommendationId,
            String actor,
            String action,
            String note,
            String createdAt
    ) {
    }

    public record ApprovalResult(
            Recommendation recommendation,
            ApprovalLog log
    ) {
    }

    public record ChatMessage(
            String id,
            String role,
            String content,
            String createdAt
    ) {
    }

    public record ChatSession(
            String id,
            String workspaceId,
            String analysisId,
            String pinnedRecommendationId,
            List<ChatMessage> messages,
            String updatedAt
    ) {
    }

    public record ChatEnvelope(
            ChatSession session,
            ChatMessage reply
    ) {
    }

    public record ReportPayload(
            int totalScore,
            String grade,
            long totalMonthlyCost,
            long wasteCost,
            long monthlySaving,
            long annualSaving,
            String executiveSummary,
            List<String> topRecommendationTitles,
            List<ReportRecommendationHighlight> topRecommendations,
            List<ReportCostHighlight> topCostItems,
            List<ReportExecutionStep> executionPlan,
            List<String> warnings
    ) {
    }

    public record ReportRecommendationHighlight(
            String id,
            String title,
            String targetResource,
            String riskLevel,
            long monthlySaving,
            String rationale
    ) {
    }

    public record ReportCostHighlight(
            String service,
            String usageType,
            long monthlyCost,
            int resourceCount
    ) {
    }

    public record ReportExecutionStep(
            String recommendationId,
            String title,
            String targetResource,
            String riskLevel,
            long monthlySaving,
            String commandSnippet,
            String rollbackSnippet,
            String rationale
    ) {
    }

    public record ReportArtifact(
            String id,
            String workspaceId,
            String analysisId,
            String templateType,
            String createdBy,
            String createdAt,
            String previewUrl,
            String exportUrl,
            ReportPayload payload
    ) {
    }

    public record ReportListResponse(
            ProjectSummary project,
            List<ReportArtifact> reports,
            int count
    ) {
    }

    public record ReportExportPayload(
            String reportId,
            String mimeType,
            boolean downloadReady,
            String placeholderMessage,
            ReportPayload payload
    ) {
    }

    public record AnalysisBundle(
            String workspaceId,
            ProjectSummary project,
            AnalysisSnapshot analysis,
            List<Recommendation> recommendations
    ) {
    }

    public record RecommendationList(
            String analysisId,
            List<Recommendation> recommendations
    ) {
    }

    public record RunAnalysisRequest(
            @NotBlank String workspaceId,
            String projectName,
            String awsRegion,
            Integer lookbackDays,
            String triggeredBy
    ) {
    }

    public record ApproveRecommendationRequest(
            String actor,
            String action,
            String note
    ) {
    }

    public record ChatRequest(
            @NotBlank String workspaceId,
            @NotBlank String analysisId,
            String content,
            String pinnedRecommendationId
    ) {
    }

    public record GenerateReportRequest(
            @NotBlank String workspaceId,
            @NotBlank String analysisId,
            String templateType,
            String createdBy,
            String projectName,
            String awsRegion
    ) {
    }
}
