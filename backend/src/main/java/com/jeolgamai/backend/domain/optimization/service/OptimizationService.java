package com.jeolgamai.backend.domain.optimization.service;

import com.jeolgamai.backend.domain.integration.dto.AwsInfrastructureResponse;
import com.jeolgamai.backend.domain.integration.dto.K8sInfrastructureResponse;
import com.jeolgamai.backend.domain.integration.dto.PrometheusCapacitySnapshot;
import com.jeolgamai.backend.domain.integration.dto.PrometheusOverviewResponse;
import com.jeolgamai.backend.domain.integration.service.AwsInfrastructureService;
import com.jeolgamai.backend.domain.integration.service.ConnectorRegistryService;
import com.jeolgamai.backend.domain.integration.service.K8sInfrastructureService;
import com.jeolgamai.backend.domain.integration.service.PrometheusIntegrationService;
import com.jeolgamai.backend.domain.optimization.dto.OptimizationModels;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;

@Service
public class OptimizationService {

    private static final String AWS_SEOUL_REGION = "ap-northeast-2";
    private static final String TEMPLATE_EXECUTIVE = "executive";
    private static final String TEMPLATE_COMBINED = "combined";
    private static final String DEFAULT_OWNER = "system";
    private static final DateTimeFormatter DISPLAY_DATE_TIME = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private static final long ESTIMATED_EKS_CONTROL_PLANE_MONTHLY_KRW = 99_000L;
    private static final long ESTIMATED_EC2_VCPU_MONTHLY_KRW = 18_000L;
    private static final long ESTIMATED_EC2_MEMORY_GIB_MONTHLY_KRW = 3_000L;
    private static final long ESTIMATED_EBS_GIB_MONTHLY_KRW = 150L;

    private static final List<PillarTemplate> PILLAR_TEMPLATES = List.of(
            new PillarTemplate("operational_excellence", "Operational Excellence", 12),
            new PillarTemplate("security", "Security", 12),
            new PillarTemplate("reliability", "Reliability", 12),
            new PillarTemplate("performance_efficiency", "Performance Efficiency", 12),
            new PillarTemplate("cost_optimization", "Cost Optimization", 16),
            new PillarTemplate("sustainability", "Sustainability", 16),
            new PillarTemplate("finops", "FinOps", 20)
    );

    private final ConnectorRegistryService connectorRegistryService;
    private final AwsInfrastructureService awsInfrastructureService;
    private final K8sInfrastructureService k8sInfrastructureService;
    private final PrometheusIntegrationService prometheusIntegrationService;
    private final OptimizationLlmService optimizationLlmService;
    private final OptimizationPersistenceService optimizationPersistenceService;
    private final OptimizationReportPdfService optimizationReportPdfService;

    private final ConcurrentMap<String, OptimizationModels.ProjectSummary> projects = new ConcurrentHashMap<>();

    public OptimizationService(
            ConnectorRegistryService connectorRegistryService,
            AwsInfrastructureService awsInfrastructureService,
            K8sInfrastructureService k8sInfrastructureService,
            PrometheusIntegrationService prometheusIntegrationService,
            OptimizationLlmService optimizationLlmService,
            OptimizationPersistenceService optimizationPersistenceService,
            OptimizationReportPdfService optimizationReportPdfService
    ) {
        this.connectorRegistryService = connectorRegistryService;
        this.awsInfrastructureService = awsInfrastructureService;
        this.k8sInfrastructureService = k8sInfrastructureService;
        this.prometheusIntegrationService = prometheusIntegrationService;
        this.optimizationLlmService = optimizationLlmService;
        this.optimizationPersistenceService = optimizationPersistenceService;
        this.optimizationReportPdfService = optimizationReportPdfService;
    }

    public OptimizationModels.AnalysisBundle runAnalysis(OptimizationModels.RunAnalysisRequest request) {
        String workspaceId = requireWorkspaceId(request.workspaceId());
        int lookbackDays = normalizeLookbackDays(request.lookbackDays());
        String triggeredBy = normalizeTriggeredBy(request.triggeredBy());
        OptimizationModels.ProjectSummary project = ensureProject(
                workspaceId,
                request.projectName(),
                request.awsRegion()
        );

        SourceSnapshot sources = loadSources(workspaceId, project);
        OptimizationModels.AnalysisBundle bundle = buildAnalysisBundle(
                workspaceId,
                project,
                lookbackDays,
                triggeredBy,
                sources
        );
        saveAnalysisBundle(bundle);
        notifyAnalysisCompleted(bundle);
        return bundle;
    }

    public OptimizationModels.AnalysisBundle getLatestAnalysis(
            String workspaceId,
            String projectName,
            String awsRegion
    ) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        return optimizationPersistenceService.findLatestAnalysisBundle(normalizedWorkspaceId)
                .map(this::decorateBundle)
                .orElseGet(() -> {
                    OptimizationModels.ProjectSummary project = ensureProject(normalizedWorkspaceId, projectName, awsRegion);
                    return new OptimizationModels.AnalysisBundle(
                            normalizedWorkspaceId,
                            project,
                            null,
                            List.of(),
                            null
                    );
                });
    }

    public OptimizationModels.AnalysisBundle getAnalysis(
            String workspaceId,
            String analysisId,
            String projectName,
            String awsRegion
    ) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        return optimizationPersistenceService.findAnalysisBundle(normalizedWorkspaceId, analysisId)
                .map(this::decorateBundle)
                .orElseThrow(() -> new IllegalArgumentException("analysisId=" + analysisId + "를 찾을 수 없습니다."));
    }

    public OptimizationModels.RecommendationList getRecommendations(String workspaceId) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        return optimizationPersistenceService.findLatestAnalysisBundle(normalizedWorkspaceId)
                .map(bundle -> new OptimizationModels.RecommendationList(
                        bundle.analysis() == null ? null : bundle.analysis().id(),
                        bundle.recommendations()
                ))
                .orElseGet(() -> new OptimizationModels.RecommendationList(null, List.of()));
    }

    public OptimizationModels.Recommendation getRecommendation(String workspaceId, String recommendationId) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        return optimizationPersistenceService.findRecommendation(normalizedWorkspaceId, recommendationId)
                .orElseThrow(() -> new IllegalArgumentException("recommendationId=" + recommendationId + "를 찾을 수 없습니다."));
    }

    public OptimizationModels.ApprovalResult approveRecommendation(
            String workspaceId,
            String recommendationId,
            OptimizationModels.ApproveRecommendationRequest request
    ) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        String action = normalizeApprovalAction(request.action());
        OptimizationModels.Recommendation current = getRecommendation(normalizedWorkspaceId, recommendationId);
        String now = nowIso();

        OptimizationModels.Recommendation updated = new OptimizationModels.Recommendation(
                current.id(),
                current.analysisId(),
                current.workspaceId(),
                current.domain(),
                current.title(),
                current.description(),
                current.targetResource(),
                "approved".equals(action) ? "approved" : "rejected",
                current.confidenceScore(),
                current.riskLevel(),
                current.estMonthlySaving(),
                current.estAnnualSaving(),
                current.commandSnippet(),
                current.rollbackSnippet(),
                current.evidence(),
                current.ruleTrace(),
                current.createdAt(),
                now,
                current.rationale()
        );

        OptimizationModels.Recommendation persistedRecommendation = optimizationPersistenceService.saveRecommendation(updated);

        OptimizationModels.ApprovalLog log = new OptimizationModels.ApprovalLog(
                createId("approval"),
                normalizedWorkspaceId,
                persistedRecommendation.id(),
                trimToNull(request.actor()) == null ? "company_admin" : request.actor().trim(),
                action,
                trimToNull(request.note()) == null ? "" : request.note().trim(),
                now
        );
        OptimizationModels.ApprovalLog persistedLog = optimizationPersistenceService.saveApprovalLog(log);

        return new OptimizationModels.ApprovalResult(persistedRecommendation, persistedLog);
    }

    public OptimizationModels.ChatSession getChatSession(
            String workspaceId,
            String analysisId,
            String pinnedRecommendationId
    ) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        ensureAnalysisExists(normalizedWorkspaceId, analysisId);
        return optimizationPersistenceService.getOrCreateChatSession(
                buildChatKey(normalizedWorkspaceId, analysisId, pinnedRecommendationId),
                normalizedWorkspaceId,
                analysisId,
                pinnedRecommendationId,
                nowIso()
        );
    }

    public OptimizationModels.ChatEnvelope appendChat(OptimizationModels.ChatRequest request) {
        String normalizedWorkspaceId = requireWorkspaceId(request.workspaceId());
        ensureAnalysisExists(normalizedWorkspaceId, request.analysisId());

        String content = trimToNull(request.content());
        if (content == null) {
            throw new IllegalArgumentException("content는 필수입니다.");
        }

        String sessionId = buildChatKey(normalizedWorkspaceId, request.analysisId(), request.pinnedRecommendationId());
        OptimizationModels.ChatSession session = optimizationPersistenceService.getOrCreateChatSession(
                sessionId,
                normalizedWorkspaceId,
                request.analysisId(),
                request.pinnedRecommendationId(),
                nowIso()
        );

        OptimizationModels.ChatMessage userMessage = new OptimizationModels.ChatMessage(
                createId("chat_msg_user"),
                "user",
                content,
                nowIso()
        );
        OptimizationModels.ChatMessage assistantMessage = new OptimizationModels.ChatMessage(
                createId("chat_msg_assistant"),
                "assistant",
                buildAssistantResponse(
                        normalizedWorkspaceId,
                        request.analysisId(),
                        content,
                        request.pinnedRecommendationId(),
                        session.messages()
                ),
                nowIso()
        );

        String updatedAt = nowIso();
        OptimizationModels.ChatSession persistedSession = optimizationPersistenceService.appendChatMessages(
                sessionId,
                List.of(userMessage, assistantMessage),
                updatedAt
        );

        return new OptimizationModels.ChatEnvelope(persistedSession, assistantMessage);
    }

    public OptimizationModels.ReportArtifact generateReport(OptimizationModels.GenerateReportRequest request) {
        String workspaceId = requireWorkspaceId(request.workspaceId());
        OptimizationModels.AnalysisBundle analysisBundle = getAnalysis(
                workspaceId,
                request.analysisId(),
                request.projectName(),
                request.awsRegion()
        );

        List<OptimizationModels.Recommendation> recommendations = analysisBundle.recommendations();
        String templateType = TEMPLATE_COMBINED;
        String reportId = createId("report");
        OptimizationModels.ReportArtifact report = new OptimizationModels.ReportArtifact(
                reportId,
                workspaceId,
                analysisBundle.analysis().id(),
                templateType,
                trimToNull(request.createdBy()) == null ? "company_admin" : request.createdBy().trim(),
                nowIso(),
                "/reports?reportId=" + reportId,
                "/api/reports/generate?reportId=" + reportId + "&format=pdf",
                new OptimizationModels.ReportPayload(
                        analysisBundle.analysis().score().totalScore(),
                        analysisBundle.analysis().score().grade(),
                        analysisBundle.analysis().totalMonthlyCost(),
                        analysisBundle.analysis().wasteCost(),
                        analysisBundle.analysis().potentialMonthlySaving(),
                        analysisBundle.analysis().potentialAnnualSaving(),
                        analysisBundle.analysis().executiveSummary(),
                        recommendations.stream()
                                .limit(3)
                                .map(OptimizationModels.Recommendation::title)
                                .toList(),
                        recommendations.stream()
                                .limit(3)
                                .map(recommendation -> new OptimizationModels.ReportRecommendationHighlight(
                                        recommendation.id(),
                                        recommendation.title(),
                                        recommendation.targetResource(),
                                        recommendation.riskLevel(),
                                        recommendation.estMonthlySaving(),
                                        recommendation.rationale()
                                ))
                                .toList(),
                        analysisBundle.analysis().costBreakdown().stream()
                                .sorted(Comparator.comparingLong(OptimizationModels.CostBreakdownItem::monthlyCost).reversed())
                                .limit(4)
                                .map(item -> new OptimizationModels.ReportCostHighlight(
                                        item.service(),
                                        item.usageType(),
                                        item.monthlyCost(),
                                        item.resourceCount()
                                ))
                                .toList(),
                        recommendations.stream()
                                .map(recommendation -> new OptimizationModels.ReportExecutionStep(
                                        recommendation.id(),
                                        recommendation.title(),
                                        recommendation.targetResource(),
                                        recommendation.riskLevel(),
                                        recommendation.estMonthlySaving(),
                                        recommendation.commandSnippet(),
                                        recommendation.rollbackSnippet(),
                                        recommendation.rationale()
                                ))
                                .toList(),
                        analysisBundle.analysis().warnings()
                )
        );

        OptimizationModels.ReportArtifact saved = optimizationPersistenceService.saveReport(report);
        OptimizationModels.ReportArtifact normalized = new OptimizationModels.ReportArtifact(
                saved.id(),
                saved.workspaceId(),
                saved.analysisId(),
                saved.templateType(),
                saved.createdBy(),
                saved.createdAt(),
                "/reports?reportId=" + saved.id(),
                "/api/reports/generate?reportId=" + saved.id() + "&format=pdf",
                saved.payload()
        );
        optimizationPersistenceService.saveNotification(
                new OptimizationModels.AppNotification(
                        createId("notification"),
                        workspaceId,
                        "info",
                        "리포트 생성 완료",
                        analysisBundle.project().name() + " 통합 리포트가 생성되었습니다. 보고서 목록에서 바로 열람하고 PDF로 내보낼 수 있습니다.",
                        analysisBundle.analysis().id(),
                        normalized.id(),
                        nowIso(),
                        false
                )
        );
        return normalized;
    }

    public OptimizationModels.ReportListResponse listReports(
            String workspaceId,
            String analysisId,
            String projectName,
            String awsRegion
    ) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        OptimizationModels.ProjectSummary project = ensureProject(normalizedWorkspaceId, projectName, awsRegion);
        List<OptimizationModels.ReportArtifact> reports = optimizationPersistenceService.listReports(
                normalizedWorkspaceId,
                trimToNull(analysisId)
        ).stream()
                .filter(report -> TEMPLATE_COMBINED.equals(report.templateType()))
                .map(report -> new OptimizationModels.ReportArtifact(
                report.id(),
                report.workspaceId(),
                report.analysisId(),
                report.templateType(),
                report.createdBy(),
                report.createdAt(),
                "/reports?reportId=" + report.id(),
                "/api/reports/generate?reportId=" + report.id() + "&format=pdf",
                report.payload()
        )).toList();

        return new OptimizationModels.ReportListResponse(project, reports, reports.size());
    }

    public OptimizationModels.ReportExportPayload getReportExport(
            String workspaceId,
            String reportId,
            String analysisId
    ) {
        OptimizationModels.ReportArtifact report = resolveReport(requireWorkspaceId(workspaceId), reportId, analysisId);
        return new OptimizationModels.ReportExportPayload(
                report.id(),
                "application/pdf",
                true,
                "데모 환경에서는 PDF 바이너리 대신 리포트 메타데이터를 반환합니다.",
                report.payload()
        );
    }

    public byte[] downloadReportPdf(
            String workspaceId,
            String reportId,
            String analysisId
    ) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        OptimizationModels.ReportArtifact report = resolveReport(normalizedWorkspaceId, reportId, analysisId);
        OptimizationModels.AnalysisBundle analysisBundle = optimizationPersistenceService
                .findAnalysisBundle(normalizedWorkspaceId, report.analysisId())
                .orElseThrow(() -> new IllegalArgumentException("analysisId=" + report.analysisId() + "를 찾을 수 없습니다."));
        return optimizationReportPdfService.renderIntegratedReport(
                analysisBundle.project(),
                analysisBundle.analysis(),
                report
        );
    }

    public OptimizationModels.NotificationList getNotifications(String workspaceId) {
        return optimizationPersistenceService.listNotifications(requireWorkspaceId(workspaceId));
    }

    public OptimizationModels.NotificationList markNotificationsRead(
            OptimizationModels.MarkNotificationsReadRequest request
    ) {
        return optimizationPersistenceService.markNotificationsRead(
                requireWorkspaceId(request.workspaceId()),
                request.notificationIds()
        );
    }

    private OptimizationModels.ReportArtifact resolveReport(
            String workspaceId,
            String reportId,
            String analysisId
    ) {
        if (trimToNull(reportId) != null) {
            return optimizationPersistenceService.findReport(workspaceId, reportId)
                    .filter(candidate -> TEMPLATE_COMBINED.equals(candidate.templateType()))
                    .orElseThrow(() -> new IllegalArgumentException("reportId=" + reportId + " 리포트를 찾을 수 없습니다."));
        }
        if (trimToNull(analysisId) != null) {
            return optimizationPersistenceService.findLatestReportByAnalysis(workspaceId, analysisId)
                    .filter(candidate -> TEMPLATE_COMBINED.equals(candidate.templateType()))
                    .orElseThrow(() -> new IllegalArgumentException("analysisId=" + analysisId + " 리포트를 찾을 수 없습니다."));
        }
        throw new IllegalArgumentException("format=pdf 요청에는 reportId 또는 analysisId가 필요합니다.");
    }

    private void ensureAnalysisExists(String workspaceId, String analysisId) {
        if (!optimizationPersistenceService.analysisExists(workspaceId, analysisId)) {
            throw new IllegalArgumentException("analysisId=" + analysisId + "를 찾을 수 없습니다.");
        }
    }

    private void notifyAnalysisCompleted(OptimizationModels.AnalysisBundle bundle) {
        if (bundle.analysis() == null) {
            return;
        }

        OptimizationModels.Recommendation primaryRecommendation = bundle.recommendations().stream()
                .findFirst()
                .orElse(null);
        String body = primaryRecommendation == null
                ? bundle.project().name() + " 분석이 완료되었습니다. 점수와 비용 요약을 확인해 다음 액션을 정리해보세요."
                : bundle.project().name() + " 분석이 완료되었습니다. 대표 권고 '" + primaryRecommendation.title()
                + "' 검토부터 시작하면 월 " + formatKrw(primaryRecommendation.estMonthlySaving()) + " 수준의 절감 효과를 기대할 수 있습니다.";

        optimizationPersistenceService.saveNotification(
                new OptimizationModels.AppNotification(
                        createId("notification"),
                        bundle.workspaceId(),
                        "info",
                        "분석 완료",
                        body,
                        bundle.analysis().id(),
                        null,
                        nowIso(),
                        false
                )
        );
    }

    private OptimizationModels.ProjectSummary ensureProject(
            String workspaceId,
            String projectName,
            String awsRegion
    ) {
        String now = nowIso();
        return projects.compute(workspaceId, (key, existing) -> {
            String resolvedName = trimToNull(projectName);
            String resolvedRegion = trimToNull(awsRegion);
            if (existing == null) {
                return new OptimizationModels.ProjectSummary(
                        workspaceId,
                        resolvedName == null ? workspaceId : resolvedName,
                        DEFAULT_OWNER,
                        resolvedRegion == null ? AWS_SEOUL_REGION : resolvedRegion,
                        now
                );
            }

            return new OptimizationModels.ProjectSummary(
                    existing.id(),
                    resolvedName == null ? existing.name() : resolvedName,
                    existing.ownerUserId(),
                    resolvedRegion == null ? existing.awsRegion() : resolvedRegion,
                    existing.createdAt()
            );
        });
    }

    private SourceSnapshot loadSources(String workspaceId, OptimizationModels.ProjectSummary project) {
        AwsInfrastructureResponse aws = null;
        K8sInfrastructureResponse k8s = null;
        PrometheusOverviewResponse prometheus = null;
        PrometheusCapacitySnapshot prometheusCapacity = null;
        List<String> warnings = new ArrayList<>();
        boolean hasAws = false;
        boolean hasK8s = false;
        boolean hasPrometheus = false;

        if (connectorRegistryService.getAwsConnector(workspaceId).isPresent()) {
            try {
                aws = awsInfrastructureService.getInfrastructure(workspaceId);
                hasAws = true;
            } catch (IllegalArgumentException exception) {
                warnings.add("AWS live 데이터 조회 실패: " + safeMessage(exception));
            }
        }

        if (connectorRegistryService.getK8sConnector(workspaceId).isPresent()) {
            try {
                k8s = k8sInfrastructureService.getInfrastructure(workspaceId);
                hasK8s = true;
            } catch (IllegalArgumentException exception) {
                warnings.add("Kubernetes live 데이터 조회 실패: " + safeMessage(exception));
            }
        }

        if (connectorRegistryService.getPrometheusConnector(workspaceId).isPresent()) {
            try {
                prometheus = prometheusIntegrationService.getOverview(workspaceId);
                prometheusCapacity = prometheusIntegrationService.getCapacitySnapshot(workspaceId);
                hasPrometheus = true;
            } catch (IllegalArgumentException exception) {
                warnings.add("Prometheus live 데이터 조회 실패: " + safeMessage(exception));
            }
        }

        if (!hasAws) {
            if (hasPrometheus && prometheusCapacity != null && prometheusCapacity.nodeCount() > 0) {
                warnings.add("AWS 연동이 없어 Prometheus capacity 기반 AWS 서울 리전 추정 비용을 사용합니다.");
            } else {
                warnings.add("AWS 연동이 없어 프로젝트 비용 분석이 제한됩니다.");
            }
        }
        if (!hasK8s) {
            warnings.add("Kubernetes 연동이 없어 컨테이너 최적화 분석이 제한됩니다.");
        }
        if (!hasPrometheus) {
            warnings.add("Prometheus 연동이 없어 지표 기반 최적화 분석이 제한됩니다.");
        }

        OptimizationModels.ProjectSummary resolvedProject = project;
        if (aws != null && !Objects.equals(project.awsRegion(), aws.region())) {
            resolvedProject = new OptimizationModels.ProjectSummary(
                    project.id(),
                    project.name(),
                    project.ownerUserId(),
                    aws.region(),
                    project.createdAt()
            );
            projects.put(project.id(), resolvedProject);
        }

        return new SourceSnapshot(
                resolvedProject,
                aws,
                k8s,
                prometheus,
                prometheusCapacity,
                new OptimizationModels.SourceCoverage(hasAws, hasK8s, hasPrometheus),
                warnings
        );
    }

    private OptimizationModels.AnalysisBundle buildAnalysisBundle(
            String workspaceId,
            OptimizationModels.ProjectSummary project,
            int lookbackDays,
            String triggeredBy,
            SourceSnapshot sources
    ) {
        String analysisId = createId("analysis");
        String now = nowIso();
        LocalDateTime nowDateTime = LocalDateTime.now();
        String periodEnd = DISPLAY_DATE_TIME.format(Instant.now().atZone(ZoneId.of("Asia/Seoul")));
        String periodStart = DISPLAY_DATE_TIME.format(
                Instant.now().minusSeconds((long) lookbackDays * 24 * 60 * 60).atZone(ZoneId.of("Asia/Seoul"))
        );

        List<OptimizationModels.InfrastructureResource> resources = buildInfrastructureResources(sources);
        List<OptimizationModels.CostBreakdownItem> costBreakdown = buildCostBreakdown(sources);
        long totalMonthlyCost = costBreakdown.stream()
                .mapToLong(OptimizationModels.CostBreakdownItem::monthlyCost)
                .sum();

        List<OptimizationModels.Recommendation> recommendations = buildRecommendations(
                analysisId,
                workspaceId,
                project,
                lookbackDays,
                totalMonthlyCost,
                sources,
                resources
        );

        long potentialMonthlySaving = recommendations.stream()
                .mapToLong(OptimizationModels.Recommendation::estMonthlySaving)
                .sum();
        long wasteCost = Math.round(totalMonthlyCost * 0.27);
        OptimizationModels.ScoreBreakdown score = calculateScoreBreakdown(
                recommendations,
                sources.coverage()
        );

        OptimizationModels.AnalysisSnapshot analysis = new OptimizationModels.AnalysisSnapshot(
                analysisId,
                workspaceId,
                triggeredBy,
                "completed",
                now,
                now,
                now,
                lookbackDays,
                periodStart,
                periodEnd,
                project.awsRegion(),
                sources.coverage(),
                totalMonthlyCost,
                wasteCost,
                potentialMonthlySaving,
                potentialMonthlySaving * 12,
                score,
                recommendations.stream().map(OptimizationModels.Recommendation::id).toList(),
                resources,
                costBreakdown,
                buildWarnings(project, sources),
                null
        );

        List<OptimizationModels.Recommendation> enrichedRecommendations = enrichRecommendationRationales(
                project,
                analysis,
                recommendations
        );
        OptimizationModels.AnalysisSnapshot enrichedAnalysis = withExecutiveSummary(
                analysis,
                enrichExecutiveSummary(project, analysis, enrichedRecommendations)
        );

        return new OptimizationModels.AnalysisBundle(
                workspaceId,
                sources.project(),
                enrichedAnalysis,
                enrichedRecommendations,
                buildAnalysisInsights(enrichedAnalysis, enrichedRecommendations)
        );
    }

    private OptimizationModels.AnalysisBundle decorateBundle(OptimizationModels.AnalysisBundle bundle) {
        return new OptimizationModels.AnalysisBundle(
                bundle.workspaceId(),
                bundle.project(),
                bundle.analysis(),
                bundle.recommendations(),
                buildAnalysisInsights(bundle.analysis(), bundle.recommendations())
        );
    }

    private OptimizationModels.AnalysisInsights buildAnalysisInsights(
            OptimizationModels.AnalysisSnapshot analysis,
            List<OptimizationModels.Recommendation> recommendations
    ) {
        if (analysis == null) {
            return null;
        }

        double avgCpu = averageUsage(analysis.resources(), true);
        double avgMemory = averageUsage(analysis.resources(), false);
        double wasteRatio = analysis.totalMonthlyCost() <= 0
                ? 0
                : (double) analysis.wasteCost() / analysis.totalMonthlyCost() * 100;
        OptimizationModels.Recommendation primaryRecommendation = recommendations.stream().findFirst().orElse(null);

        List<OptimizationModels.DecisionSignal> signals = List.of(
                buildDecisionSignal(
                        "cpu-efficiency",
                        "CPU 평균 사용률",
                        percentLabel(avgCpu),
                        usageStatusLabel(avgCpu, 30, 75),
                        usageTone(avgCpu, 30, 75),
                        avgCpu < 30
                                ? "현재 CPU 여유가 커서 과다 스펙 또는 유휴 리소스 가능성이 있습니다."
                                : avgCpu > 75
                                ? "피크 대응 여유가 적어 scale-out 또는 limit 재조정이 필요할 수 있습니다."
                                : "현재 부하 대비 안정적인 구간으로 보입니다."
                ),
                buildDecisionSignal(
                        "memory-efficiency",
                        "메모리 평균 사용률",
                        percentLabel(avgMemory),
                        usageStatusLabel(avgMemory, 40, 80),
                        usageTone(avgMemory, 40, 80),
                        avgMemory < 40
                                ? "메모리 사용률이 낮아 requests/limits 조정 여지가 있습니다."
                                : avgMemory > 80
                                ? "메모리 헤드룸이 작아 OOM 방지 관점 점검이 필요합니다."
                                : "메모리 사용량은 비교적 균형적으로 유지되고 있습니다."
                ),
                buildDecisionSignal(
                        "cost-efficiency",
                        "비용 대비 낭비",
                        percentLabel(wasteRatio),
                        wasteRatio > 24 ? "최적화 가능" : "관리 가능",
                        wasteRatio > 24 ? "opportunity" : "stable",
                        wasteRatio > 24
                                ? "유휴 비용과 과할당 추정 비중이 커서 우선 절감 후보를 검토할 가치가 큽니다."
                                : "낭비 비용 비중이 과도하지는 않지만 지속적인 점검은 필요합니다."
                ),
                buildDecisionSignal(
                        "stability",
                        "안정성 신호",
                        analysis.score().confidencePercent() + "%",
                        analysis.warnings().isEmpty() ? "신뢰 가능" : "주의 필요",
                        analysis.warnings().isEmpty() ? "stable" : "attention",
                        analysis.warnings().isEmpty()
                                ? "수집된 데이터 기준으로 분석 신뢰도가 안정적으로 유지되고 있습니다."
                                : analysis.warnings().get(0)
                )
        );

        List<OptimizationModels.WhatIfScenario> scenarios = List.of(
                new OptimizationModels.WhatIfScenario(
                        "baseline",
                        "현재 패턴 유지",
                        "현재 부하 패턴이 유지되면 월 비용은 큰 변동 없이 이어질 가능성이 높습니다.",
                        "우선 확인",
                        primaryRecommendation == null
                                ? "추가 연동을 통해 절감 후보를 확보하세요."
                                : primaryRecommendation.title() + "부터 검토해 즉시 절감 효과를 확인하세요.",
                        "low",
                        analysis.totalMonthlyCost(),
                        0
                ),
                new OptimizationModels.WhatIfScenario(
                        "traffic-plus-30",
                        "트래픽 30% 증가",
                        "현재 패턴 대비 요청이 30% 증가했을 때의 비용과 대응 여유를 비교하는 운영 시나리오입니다.",
                        "사전 준비",
                        avgCpu > 70 || avgMemory > 75
                                ? "오토스케일링 또는 requests/limits 재조정 계획을 먼저 점검하세요."
                                : "현재 여유가 있지만 HPA 및 비용 상한을 함께 검토하세요.",
                        avgCpu > 70 || avgMemory > 75 ? "high" : "medium",
                        Math.round(analysis.totalMonthlyCost() * 1.18),
                        Math.round(analysis.totalMonthlyCost() * 0.18)
                ),
                new OptimizationModels.WhatIfScenario(
                        "optimize-primary",
                        "대표 권고 우선 적용",
                        primaryRecommendation == null
                                ? "아직 바로 적용할 대표 권고가 없습니다."
                                : "상위 권고 1건을 우선 적용했을 때의 절감 효과를 가정한 시나리오입니다.",
                        "실행 가이드",
                        primaryRecommendation == null
                                ? "AWS, Kubernetes, Prometheus를 더 연동해 권고 후보를 늘리세요."
                                : primaryRecommendation.title() + " 적용 후 1일간 메트릭을 비교해 검증하세요.",
                        primaryRecommendation == null ? "medium" : primaryRecommendation.riskLevel(),
                        Math.max(0, analysis.totalMonthlyCost() - (primaryRecommendation == null ? 0 : primaryRecommendation.estMonthlySaving())),
                        primaryRecommendation == null ? 0 : -primaryRecommendation.estMonthlySaving()
                )
        );

        List<OptimizationModels.ActionGuideStep> actionGuide = List.of(
                new OptimizationModels.ActionGuideStep(
                        "understand-state",
                        "현재 상태 확인",
                        "CPU, 메모리, 낭비 비중, 신뢰도 신호를 먼저 읽고 어떤 리소스가 과다/주의 상태인지 확인합니다.",
                        "신호 카드에서 '최적화 가능' 또는 '주의 필요' 항목을 먼저 봅니다."
                ),
                new OptimizationModels.ActionGuideStep(
                        "pick-primary",
                        "대표 권고 우선 검토",
                        primaryRecommendation == null
                                ? "대표 권고가 없어 추가 데이터 연동이 필요합니다."
                                : primaryRecommendation.title() + " 권고를 먼저 검토하면 가장 큰 절감 효과를 빠르게 확인할 수 있습니다.",
                        primaryRecommendation == null
                                ? "Prometheus/K8s/AWS 연동을 보강합니다."
                                : primaryRecommendation.targetResource() + " 대상과 리스크를 먼저 확인합니다."
                ),
                new OptimizationModels.ActionGuideStep(
                        "simulate-impact",
                        "시뮬레이션으로 영향 검증",
                        "실시간 예측 대신 what-if 시나리오로 비용과 안정성 변화를 미리 설명합니다.",
                        "트래픽 증가/대표 권고 적용 시나리오를 비교해 다음 액션을 정합니다."
                )
        );

        String priorityHeadline = primaryRecommendation == null
                ? "지금은 연동 범위를 늘려 더 신뢰도 높은 권고를 확보하는 것이 우선입니다."
                : "지금은 " + primaryRecommendation.title() + " 권고를 먼저 검토하는 것이 가장 큰 절감 효과를 기대할 수 있습니다.";

        return new OptimizationModels.AnalysisInsights(
                analysis.score().totalScore(),
                analysis.score().grade(),
                analysis.executiveSummary(),
                priorityHeadline,
                signals,
                scenarios,
                actionGuide
        );
    }

    private OptimizationModels.DecisionSignal buildDecisionSignal(
            String id,
            String label,
            String value,
            String statusLabel,
            String tone,
            String detail
    ) {
        return new OptimizationModels.DecisionSignal(id, label, value, statusLabel, tone, detail);
    }

    private double averageUsage(List<OptimizationModels.InfrastructureResource> resources, boolean cpu) {
        return resources.stream()
                .map(cpu ? OptimizationModels.InfrastructureResource::cpuUsagePercent : OptimizationModels.InfrastructureResource::memoryUsagePercent)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);
    }

    private String percentLabel(double value) {
        return trimNumeric(value) + "%";
    }

    private String usageStatusLabel(double value, double lowerBound, double upperBound) {
        if (value <= 0) {
            return "데이터 부족";
        }
        if (value < lowerBound) {
            return "최적화 가능";
        }
        if (value > upperBound) {
            return "주의 필요";
        }
        return "안정적";
    }

    private String usageTone(double value, double lowerBound, double upperBound) {
        if (value <= 0) {
            return "muted";
        }
        if (value < lowerBound) {
            return "opportunity";
        }
        if (value > upperBound) {
            return "attention";
        }
        return "stable";
    }

    private List<OptimizationModels.InfrastructureResource> buildInfrastructureResources(SourceSnapshot sources) {
        if (sources.aws() == null) {
            return buildEstimatedInfrastructureResources(sources);
        }

        Map<String, CostAverage> averages = buildCostAverages(sources.aws());
        Double cpu = sources.prometheus() == null ? null : sources.prometheus().summary().cpuUsagePercent();
        Double memory = sources.prometheus() == null ? null : sources.prometheus().summary().memoryUsagePercent();

        return sources.aws().resources().stream()
                .map(resource -> {
                    String category = normalizeAwsCategory(resource.type());
                    CostAverage average = averages.getOrDefault(category, new CostAverage(0, 0));
                    long monthlyCost = average.resourceCount <= 0
                            ? average.totalMonthlyCost
                            : Math.round((double) average.totalMonthlyCost / average.resourceCount);
                    return new OptimizationModels.InfrastructureResource(
                            resource.id(),
                            resource.name(),
                            resource.type(),
                            resource.region(),
                            resource.status(),
                            "EC2".equals(category) ? cpu : null,
                            ("EC2".equals(category) || "RDS".equals(category)) ? memory : null,
                            monthlyCost,
                            inferRiskLevel(resource.status(), category, cpu)
                    );
                })
                .sorted(Comparator.comparing(OptimizationModels.InfrastructureResource::monthlyCost).reversed())
                .toList();
    }

    private Map<String, CostAverage> buildCostAverages(AwsInfrastructureResponse aws) {
        Map<String, CostAverage> averages = new ConcurrentHashMap<>();
        for (AwsInfrastructureResponse.ServiceCost serviceCost : aws.costByService()) {
            String category = normalizeServiceCategory(serviceCost.service());
            averages.put(category, new CostAverage(
                    Math.round(serviceCost.monthToDateCost()),
                    serviceCost.resourceCount()
            ));
        }
        return averages;
    }

    private List<OptimizationModels.CostBreakdownItem> buildCostBreakdown(SourceSnapshot sources) {
        if (sources.aws() == null) {
            return buildEstimatedCostBreakdown(sources);
        }

        return sources.aws().costByService().stream()
                .map(item -> new OptimizationModels.CostBreakdownItem(
                        item.service(),
                        usageTypeForService(item.service()),
                        Math.round(item.monthToDateCost()),
                        sources.aws().region(),
                        item.resourceCount()
                ))
                .sorted(Comparator.comparing(OptimizationModels.CostBreakdownItem::monthlyCost).reversed())
                .toList();
    }

    private List<OptimizationModels.InfrastructureResource> buildEstimatedInfrastructureResources(SourceSnapshot sources) {
        if (sources.prometheusCapacity() == null || sources.prometheusCapacity().nodeCount() <= 0) {
            return List.of();
        }

        PrometheusCapacitySnapshot capacity = sources.prometheusCapacity();
        PrometheusCostEstimate estimate = estimatePrometheusAwsSeoulCost(capacity);
        Double cpuUsage = sources.prometheus() == null ? null : sources.prometheus().summary().cpuUsagePercent();
        Double memoryUsage = sources.prometheus() == null ? null : sources.prometheus().summary().memoryUsagePercent();

        List<OptimizationModels.InfrastructureResource> resources = new ArrayList<>();
        resources.add(new OptimizationModels.InfrastructureResource(
                "estimated-node-pool",
                "Prometheus 추정 Node Pool",
                "EC2",
                sources.project().awsRegion(),
                "estimated",
                cpuUsage,
                memoryUsage,
                estimate.ec2MonthlyCost(),
                inferRiskLevel("estimated", "EC2", cpuUsage)
        ));
        resources.add(new OptimizationModels.InfrastructureResource(
                "estimated-eks-control-plane",
                "Prometheus 추정 EKS Control Plane",
                "EKS",
                sources.project().awsRegion(),
                "estimated",
                null,
                null,
                estimate.eksMonthlyCost(),
                "low"
        ));
        if (estimate.ebsMonthlyCost() > 0) {
            resources.add(new OptimizationModels.InfrastructureResource(
                    "estimated-persistent-storage",
                    "Prometheus 추정 Persistent Storage",
                    "S3",
                    sources.project().awsRegion(),
                    "estimated",
                    null,
                    null,
                    estimate.ebsMonthlyCost(),
                    "low"
            ));
        }

        return resources.stream()
                .sorted(Comparator.comparing(OptimizationModels.InfrastructureResource::monthlyCost).reversed())
                .toList();
    }

    private List<OptimizationModels.CostBreakdownItem> buildEstimatedCostBreakdown(SourceSnapshot sources) {
        if (sources.prometheusCapacity() == null || sources.prometheusCapacity().nodeCount() <= 0) {
            return List.of();
        }

        PrometheusCapacitySnapshot capacity = sources.prometheusCapacity();
        PrometheusCostEstimate estimate = estimatePrometheusAwsSeoulCost(capacity);
        List<OptimizationModels.CostBreakdownItem> items = new ArrayList<>();
        items.add(new OptimizationModels.CostBreakdownItem(
                "Amazon Elastic Compute Cloud",
                "Estimated On-Demand Worker Nodes",
                estimate.ec2MonthlyCost(),
                sources.project().awsRegion(),
                Math.max(capacity.nodeCount(), 1)
        ));
        items.add(new OptimizationModels.CostBreakdownItem(
                "Amazon Elastic Kubernetes Service",
                "Estimated Control Plane",
                estimate.eksMonthlyCost(),
                sources.project().awsRegion(),
                1
        ));
        if (estimate.ebsMonthlyCost() > 0) {
            items.add(new OptimizationModels.CostBreakdownItem(
                    "Amazon Elastic Block Store",
                    "Estimated Persistent Volume",
                    estimate.ebsMonthlyCost(),
                    sources.project().awsRegion(),
                    Math.max(capacity.nodeCount(), 1)
            ));
        }

        return items.stream()
                .sorted(Comparator.comparing(OptimizationModels.CostBreakdownItem::monthlyCost).reversed())
                .toList();
    }

    private PrometheusCostEstimate estimatePrometheusAwsSeoulCost(PrometheusCapacitySnapshot capacity) {
        double memoryGiB = bytesToGiB(capacity.totalMemoryBytes());
        double storageGiB = bytesToGiB(capacity.pvcStorageBytes());

        long ec2MonthlyCost = Math.round(
                capacity.totalCpuCores() * ESTIMATED_EC2_VCPU_MONTHLY_KRW
                        + memoryGiB * ESTIMATED_EC2_MEMORY_GIB_MONTHLY_KRW
        );
        long ebsMonthlyCost = Math.round(storageGiB * ESTIMATED_EBS_GIB_MONTHLY_KRW);

        return new PrometheusCostEstimate(
                Math.max(ec2MonthlyCost, 0),
                ESTIMATED_EKS_CONTROL_PLANE_MONTHLY_KRW,
                Math.max(ebsMonthlyCost, 0)
        );
    }

    private double bytesToGiB(double bytes) {
        if (bytes <= 0) {
            return 0;
        }
        return bytes / (1024d * 1024d * 1024d);
    }

    private List<OptimizationModels.Recommendation> buildRecommendations(
            String analysisId,
            String workspaceId,
            OptimizationModels.ProjectSummary project,
            int lookbackDays,
            long totalMonthlyCost,
            SourceSnapshot sources,
            List<OptimizationModels.InfrastructureResource> resources
    ) {
        List<OptimizationModels.Recommendation> recommendations = new ArrayList<>();
        String now = nowIso();

        Map<String, OptimizationModels.InfrastructureResource> resourcesByCategory = resources.stream()
                .collect(Collectors.toMap(
                        resource -> normalizeAwsCategory(resource.type()),
                        resource -> resource,
                        (left, right) -> left.monthlyCost() >= right.monthlyCost() ? left : right
                ));

        if (sources.aws() != null) {
            OptimizationModels.CostBreakdownItem ec2 = findCostItemByCategory(sources, "EC2");
            OptimizationModels.CostBreakdownItem rds = findCostItemByCategory(sources, "RDS");
            OptimizationModels.CostBreakdownItem s3 = findCostItemByCategory(sources, "S3");

            if (ec2 != null && resourcesByCategory.containsKey("EC2")) {
                OptimizationModels.InfrastructureResource target = resourcesByCategory.get("EC2");
                double cpu = target.cpuUsagePercent() == null ? 0 : target.cpuUsagePercent();
                double savingRate = cpu < 20 ? 0.28 : cpu < 40 ? 0.18 : 0.1;
                recommendations.add(createRecommendation(
                        analysisId,
                        workspaceId,
                        "compute",
                        "서울 리전 EC2 라이트사이징",
                        "실제 EC2 비용과 Prometheus CPU 사용률을 기준으로 저활용 인스턴스를 축소합니다.",
                        target.id(),
                        Math.round(ec2.monthlyCost() * savingRate),
                        cpu < 20 ? 0.95 : 0.87,
                        cpu < 20 ? "low" : "medium",
                        "aws ec2 modify-instance-attribute --region " + project.awsRegion()
                                + " --instance-id " + target.id()
                                + " --instance-type '{\"Value\":\"m7i.large\"}'",
                        "aws ec2 modify-instance-attribute --region " + project.awsRegion()
                                + " --instance-id " + target.id()
                                + " --instance-type '{\"Value\":\"m7i.xlarge\"}'",
                        List.of(
                                new OptimizationModels.MetricValue("cpu_usage", round(cpu), "%"),
                                new OptimizationModels.MetricValue(
                                        "monthly_cost",
                                        ec2.monthlyCost(),
                                        "KRW"
                                )
                        ),
                        "WA-COST-EC2-SEOUL-101",
                        "Well-Architected: Cost Optimization",
                        "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html",
                        lookbackDays,
                        now
                ));
            }

            if (rds != null && resourcesByCategory.containsKey("RDS")) {
                OptimizationModels.InfrastructureResource target = resourcesByCategory.get("RDS");
                recommendations.add(createRecommendation(
                        analysisId,
                        workspaceId,
                        "database",
                        "RDS 인스턴스 클래스 및 RI 검토",
                        "실제 RDS 사용량과 월 비용을 기준으로 인스턴스 클래스 재조정 또는 Reserved 적용 대상을 추립니다.",
                        target.id(),
                        Math.round(rds.monthlyCost() * 0.16),
                        0.88,
                        "low",
                        "aws rds modify-db-instance --apply-immediately --db-instance-identifier "
                                + target.id()
                                + " --db-instance-class db.r6g.large",
                        "aws rds modify-db-instance --apply-immediately --db-instance-identifier "
                                + target.id()
                                + " --db-instance-class db.r6g.xlarge",
                        List.of(
                                new OptimizationModels.MetricValue("monthly_cost", rds.monthlyCost(), "KRW"),
                                new OptimizationModels.MetricValue(
                                        "memory_usage",
                                        target.memoryUsagePercent() == null ? 0 : round(target.memoryUsagePercent()),
                                        "%"
                                )
                        ),
                        "WA-COST-RDS-SEOUL-102",
                        "Well-Architected: Cost Optimization",
                        "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html",
                        lookbackDays,
                        now
                ));
            }

            if (s3 != null && resourcesByCategory.containsKey("S3")) {
                OptimizationModels.InfrastructureResource target = resourcesByCategory.get("S3");
                recommendations.add(createRecommendation(
                        analysisId,
                        workspaceId,
                        "storage",
                        "S3 Lifecycle 및 보관 정책 최적화",
                        "실제 S3 버킷 비용을 기준으로 오래된 로그/아카이브를 IA 또는 Glacier로 이관합니다.",
                        target.id(),
                        Math.round(s3.monthlyCost() * 0.22),
                        0.84,
                        "low",
                        "aws s3api put-bucket-lifecycle-configuration --region " + project.awsRegion()
                                + " --bucket " + target.name()
                                + " --lifecycle-configuration file://s3-lifecycle.json",
                        "aws s3api delete-bucket-lifecycle --region " + project.awsRegion()
                                + " --bucket " + target.name(),
                        List.of(
                                new OptimizationModels.MetricValue("monthly_cost", s3.monthlyCost(), "KRW"),
                                new OptimizationModels.MetricValue("bucket_count", s3.resourceCount(), "count")
                        ),
                        "WA-COST-S3-SEOUL-103",
                        "Well-Architected: Cost Optimization",
                        "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html",
                        lookbackDays,
                        now
                ));
            }
        }

        if (sources.k8s() != null && !sources.k8s().deployments().isEmpty()) {
            K8sInfrastructureResponse.Deployment deployment = sources.k8s().deployments().stream()
                    .max(Comparator.comparing(K8sInfrastructureResponse.Deployment::replicas))
                    .orElse(sources.k8s().deployments().get(0));
            int restartCount = sources.k8s().pods().stream()
                    .filter(pod -> deployment.namespace().equals(pod.namespace()))
                    .mapToInt(K8sInfrastructureResponse.Pod::restartCount)
                    .sum();
            long saving = totalMonthlyCost <= 0 ? 0 : Math.round(totalMonthlyCost * 0.08);
            recommendations.add(createRecommendation(
                    analysisId,
                    workspaceId,
                    "eks",
                    "K8s requests/limits 재조정",
                    "실제 Deployment/POD 상태를 기준으로 requests/limits를 줄여 노드 과할당을 완화합니다.",
                    deployment.namespace() + "/" + deployment.name(),
                    saving,
                    restartCount > 5 ? 0.78 : 0.86,
                    restartCount > 5 ? "high" : "medium",
                    "kubectl set resources deployment " + deployment.name()
                            + " -n " + deployment.namespace()
                            + " --requests=cpu=250m,memory=384Mi --limits=cpu=700m,memory=768Mi",
                    "kubectl rollout undo deployment/" + deployment.name() + " -n " + deployment.namespace(),
                    List.of(
                            new OptimizationModels.MetricValue("replicas", deployment.replicas(), "count"),
                            new OptimizationModels.MetricValue("ready_replicas", deployment.readyReplicas(), "count"),
                            new OptimizationModels.MetricValue("restart_count", restartCount, "count")
                    ),
                    "K8S-EFFICIENCY-201",
                    "Kubernetes: Resource Management",
                    "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
                    lookbackDays,
                    now
            ));
        }

        if (sources.prometheus() != null) {
            PrometheusOverviewResponse.Summary summary = sources.prometheus().summary();
            boolean highLatency = summary.p95LatencyMs() >= 100;
            boolean highError = summary.errorRatePercent() >= 5;
            double idleCpu = summary.cpuUsagePercent();
            long saving = totalMonthlyCost <= 0 ? 0 : Math.round(totalMonthlyCost * (highLatency || highError ? 0.06 : 0.04));
            CommandPlan commandPlan = buildPrometheusCommandPlan(sources, project, highLatency, highError);

            recommendations.add(createRecommendation(
                    analysisId,
                    workspaceId,
                    "finops",
                    highLatency || highError
                            ? "Prometheus 기반 병목 구간 튜닝"
                            : "Prometheus 기반 유휴 리소스 스케줄 다운",
                    highLatency || highError
                            ? "실제 지연시간/오류율 지표를 기준으로 HPA 임계값과 병목 워크로드를 조정합니다."
                            : "실제 CPU/메모리 지표를 기준으로 장시간 유휴한 리소스를 스케줄 다운 대상으로 분류합니다.",
                    commandPlan.targetResource(),
                    saving,
                    highLatency || highError ? 0.82 : 0.85,
                    highLatency || highError ? "medium" : "low",
                    commandPlan.commandSnippet(),
                    commandPlan.rollbackSnippet(),
                    List.of(
                            new OptimizationModels.MetricValue("cpu_usage", round(idleCpu), "%"),
                            new OptimizationModels.MetricValue("memory_usage", round(summary.memoryUsagePercent()), "%"),
                            new OptimizationModels.MetricValue("p95_latency", round(summary.p95LatencyMs()), "ms"),
                            new OptimizationModels.MetricValue("error_rate", round(summary.errorRatePercent()), "%")
                    ),
                    "PROM-OPS-301",
                    "Observability-driven Optimization",
                    "https://prometheus.io/docs/prometheus/latest/querying/basics/",
                    lookbackDays,
                    now
            ));
        }

        if (recommendations.isEmpty()) {
            recommendations.add(createRecommendation(
                    analysisId,
                    workspaceId,
                    "finops",
                    "실데이터 연동 우선",
                    "AWS, Kubernetes, Prometheus 연동이 충분하지 않아 backend가 실데이터 기반 분석을 완료하지 못했습니다.",
                    "integration",
                    0,
                    0.35,
                    "low",
                    "# integrations 메뉴에서 AWS/K8s/Prometheus 연동을 먼저 완료하세요",
                    "# rollback not required",
                    List.of(new OptimizationModels.MetricValue("coverage", 0, "%")),
                    "DATA-COVERAGE-000",
                    "Data Coverage Baseline",
                    "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
                    lookbackDays,
                    now
            ));
        }

        return recommendations;
    }

    private OptimizationModels.Recommendation createRecommendation(
            String analysisId,
            String workspaceId,
            String domain,
            String title,
            String description,
            String targetResource,
            long monthlySaving,
            double confidenceScore,
            String riskLevel,
            String commandSnippet,
            String rollbackSnippet,
            List<OptimizationModels.MetricValue> metrics,
            String ruleId,
            String principleName,
            String docUrl,
            int lookbackDays,
            String now
    ) {
        return new OptimizationModels.Recommendation(
                createId("rec"),
                analysisId,
                workspaceId,
                domain,
                title,
                description,
                targetResource,
                "reviewed",
                round(confidenceScore),
                riskLevel,
                monthlySaving,
                monthlySaving * 12,
                commandSnippet,
                rollbackSnippet,
                new OptimizationModels.RecommendationEvidence(
                        lookbackDays + "일 관측 구간과 backend live connector 데이터를 기반으로 계산했습니다.",
                        lookbackDays,
                        metrics
                ),
                new OptimizationModels.RuleTrace(
                        ruleId,
                        principleName,
                        docUrl,
                        "2026.03"
                ),
                now,
                now,
                null
        );
    }

    private List<OptimizationModels.Recommendation> enrichRecommendationRationales(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            List<OptimizationModels.Recommendation> recommendations
    ) {
        return recommendations.stream()
                .map(recommendation -> withRecommendationRationale(
                        recommendation,
                        enrichRecommendationRationale(project, analysis, recommendation, recommendations)
                ))
                .toList();
    }

    private String enrichRecommendationRationale(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.Recommendation recommendation,
            List<OptimizationModels.Recommendation> recommendations
    ) {
        String fallback = buildFallbackRecommendationRationale(analysis, recommendation);
        String prompt = buildRecommendationNarrativePrompt(project, analysis, recommendation, recommendations);
        return optimizationLlmService.complete(
                project.id(),
                analysis.id(),
                buildRecommendationNarrativeSystemPrompt(),
                prompt
        ).map(this::sanitizeNarrativeText).filter(text -> !text.isBlank()).orElse(fallback);
    }

    private String enrichExecutiveSummary(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            List<OptimizationModels.Recommendation> recommendations
    ) {
        String fallback = buildFallbackExecutiveSummary(analysis, recommendations);
        String prompt = buildExecutiveSummaryPrompt(project, analysis, recommendations);
        return optimizationLlmService.complete(
                project.id(),
                analysis.id(),
                buildExecutiveSummarySystemPrompt(),
                prompt
        ).map(this::sanitizeNarrativeText).filter(text -> !text.isBlank()).orElse(fallback);
    }

    private String buildExecutiveSummarySystemPrompt() {
        return """
                당신은 JeolgamAI의 분석 요약 작성기다.
                한국어로만 답하고, 제공된 숫자와 리소스명만 사용한다.
                2~4문장으로 끝내고, 보고서 말투보다 운영 동료에게 브리핑하듯 자연스럽게 쓴다.
                첫 문장은 현재 비용/절감/상태를 요약하고, 뒤 문장에서는 가장 먼저 볼 권고와 이유를 짧게 설명한다.
                마크다운 제목, 번호 목록, 과장 표현은 쓰지 않는다.
                """;
    }

    private String buildExecutiveSummaryPrompt(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            List<OptimizationModels.Recommendation> recommendations
    ) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("프로젝트명: ").append(project.name()).append('\n');
        prompt.append("리전: ").append(project.awsRegion()).append('\n');
        prompt.append("분석 점수: ")
                .append(analysis.score().totalScore())
                .append("점 (")
                .append(analysis.score().grade())
                .append(")\n");
        prompt.append("총 월비용: ").append(formatKrw(analysis.totalMonthlyCost())).append('\n');
        prompt.append("낭비 비용: ").append(formatKrw(analysis.wasteCost())).append('\n');
        prompt.append("예상 월 절감: ").append(formatKrw(analysis.potentialMonthlySaving())).append('\n');
        prompt.append("소스 커버리지: aws=")
                .append(analysis.sourceCoverage().aws())
                .append(", k8s=")
                .append(analysis.sourceCoverage().k8s())
                .append(", prometheus=")
                .append(analysis.sourceCoverage().prometheus())
                .append('\n');
        prompt.append("경고: ")
                .append(analysis.warnings().isEmpty() ? "없음" : String.join(" | ", analysis.warnings().stream().limit(4).toList()))
                .append('\n');
        prompt.append("권고 목록:\n");
        prompt.append(recommendations.stream()
                .limit(4)
                .map(recommendation -> "- " + recommendation.title()
                        + " | target=" + recommendation.targetResource()
                        + " | risk=" + recommendation.riskLevel()
                        + " | monthlySaving=" + formatKrw(recommendation.estMonthlySaving()))
                .collect(Collectors.joining("\n")));
        return prompt.toString();
    }

    private String buildRecommendationNarrativeSystemPrompt() {
        return """
                당신은 JeolgamAI의 권고 설명 작성기다.
                한국어로만 답하고, 제공된 메트릭과 명령만 사용한다.
                2~3문장으로 작성하고, 첫 문장에서 왜 이 권고를 보는지 설명한다.
                둘째 문장에서는 실제 영향 또는 적용 포인트를 말한다.
                필요하면 마지막 짧은 문장으로 리스크나 검증 포인트를 덧붙인다.
                마크다운 제목, bullet, 코드블록은 쓰지 않는다.
                """;
    }

    private String buildRecommendationNarrativePrompt(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.Recommendation recommendation,
            List<OptimizationModels.Recommendation> recommendations
    ) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("프로젝트명: ").append(project.name()).append('\n');
        prompt.append("리전: ").append(project.awsRegion()).append('\n');
        prompt.append("분석 점수: ")
                .append(analysis.score().totalScore())
                .append("점 (")
                .append(analysis.score().grade())
                .append(")\n");
        prompt.append("총 월비용: ").append(formatKrw(analysis.totalMonthlyCost())).append('\n');
        prompt.append("예상 월 절감: ").append(formatKrw(analysis.potentialMonthlySaving())).append('\n');
        prompt.append("현재 권고 제목: ").append(recommendation.title()).append('\n');
        prompt.append("설명: ").append(recommendation.description()).append('\n');
        prompt.append("대상 리소스: ").append(recommendation.targetResource()).append('\n');
        prompt.append("리스크: ").append(recommendation.riskLevel()).append('\n');
        prompt.append("신뢰도: ").append(Math.round(recommendation.confidenceScore() * 100)).append("%\n");
        prompt.append("예상 월 절감: ").append(formatKrw(recommendation.estMonthlySaving())).append('\n');
        prompt.append("근거 메트릭: ").append(recommendation.evidence().metrics().stream()
                .map(metric -> metric.key() + "=" + trimNumeric(metric.value()) + metric.unit())
                .collect(Collectors.joining(", "))).append('\n');
        prompt.append("실행 명령: ").append(recommendation.commandSnippet()).append('\n');
        prompt.append("롤백 명령: ").append(recommendation.rollbackSnippet()).append('\n');
        prompt.append("비교 대상 상위 권고:\n");
        prompt.append(recommendations.stream()
                .filter(candidate -> !Objects.equals(candidate.id(), recommendation.id()))
                .limit(2)
                .map(candidate -> "- " + candidate.title()
                        + " | risk=" + candidate.riskLevel()
                        + " | monthlySaving=" + formatKrw(candidate.estMonthlySaving()))
                .collect(Collectors.joining("\n")));
        return prompt.toString();
    }

    private String buildFallbackExecutiveSummary(
            OptimizationModels.AnalysisSnapshot analysis,
            List<OptimizationModels.Recommendation> recommendations
    ) {
        OptimizationModels.Recommendation topRecommendation = recommendations.stream()
                .max(Comparator.comparingLong(OptimizationModels.Recommendation::estMonthlySaving))
                .orElse(null);
        if (topRecommendation == null) {
            return "AI 요약을 아직 생성하지 못했습니다. 다시 시도하면 최신 분석 결과를 바탕으로 짧은 브리핑을 제공할 수 있습니다.";
        }

        return "AI 요약을 아직 생성하지 못해 규칙 기반 설명을 대신 보여드립니다. 현재 프로젝트는 월 " + formatKrw(analysis.totalMonthlyCost())
                + " 규모로 집계됐고, 지금 기준으로는 월 "
                + formatKrw(analysis.potentialMonthlySaving())
                + " 정도를 줄일 여지가 있습니다. 가장 먼저 볼 권고는 "
                + topRecommendation.title()
                + "이고, 대상은 " + topRecommendation.targetResource()
                + " 입니다. 절감 효과가 가장 크고 현재 분석 점수 "
                + analysis.score().totalScore()
                + "점에서 직접적으로 영향을 주는 항목이라 우선순위가 높습니다.";
    }

    private String buildFallbackRecommendationRationale(
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.Recommendation recommendation
    ) {
        String metrics = recommendation.evidence().metrics().stream()
                .limit(3)
                .map(metric -> metric.key() + "=" + trimNumeric(metric.value()) + metric.unit())
                .collect(Collectors.joining(", "));
        return "AI 설명을 아직 생성하지 못해 규칙 기반 설명을 대신 보여드립니다. " + recommendation.title() + " 권고는 " + recommendation.targetResource()
                + " 쪽에서 보이는 낭비나 과할당을 줄이기 위해 먼저 보는 항목입니다. "
                + recommendation.description()
                + " 현재 근거 메트릭은 " + (metrics.isBlank() ? "충분하지 않음" : metrics)
                + "이고, 적용하면 월 " + formatKrw(recommendation.estMonthlySaving())
                + " 수준 절감을 기대할 수 있습니다.";
    }

    private OptimizationModels.Recommendation withRecommendationRationale(
            OptimizationModels.Recommendation recommendation,
            String rationale
    ) {
        return new OptimizationModels.Recommendation(
                recommendation.id(),
                recommendation.analysisId(),
                recommendation.workspaceId(),
                recommendation.domain(),
                recommendation.title(),
                recommendation.description(),
                recommendation.targetResource(),
                recommendation.status(),
                recommendation.confidenceScore(),
                recommendation.riskLevel(),
                recommendation.estMonthlySaving(),
                recommendation.estAnnualSaving(),
                recommendation.commandSnippet(),
                recommendation.rollbackSnippet(),
                recommendation.evidence(),
                recommendation.ruleTrace(),
                recommendation.createdAt(),
                recommendation.updatedAt(),
                rationale
        );
    }

    private OptimizationModels.AnalysisSnapshot withExecutiveSummary(
            OptimizationModels.AnalysisSnapshot analysis,
            String executiveSummary
    ) {
        return new OptimizationModels.AnalysisSnapshot(
                analysis.id(),
                analysis.workspaceId(),
                analysis.triggeredBy(),
                analysis.status(),
                analysis.createdAt(),
                analysis.startedAt(),
                analysis.completedAt(),
                analysis.lookbackDays(),
                analysis.periodStart(),
                analysis.periodEnd(),
                analysis.awsRegion(),
                analysis.sourceCoverage(),
                analysis.totalMonthlyCost(),
                analysis.wasteCost(),
                analysis.potentialMonthlySaving(),
                analysis.potentialAnnualSaving(),
                analysis.score(),
                analysis.recommendationIds(),
                analysis.resources(),
                analysis.costBreakdown(),
                analysis.warnings(),
                executiveSummary
        );
    }

    private String sanitizeNarrativeText(String value) {
        return value
                .replace("\r", "")
                .replaceAll("(?m)^#{1,6}\\s*", "")
                .replaceAll("(?m)^[-*]\\s+", "")
                .trim();
    }

    private OptimizationModels.ScoreBreakdown calculateScoreBreakdown(
            List<OptimizationModels.Recommendation> recommendations,
            OptimizationModels.SourceCoverage coverage
    ) {
        Map<String, MutablePillarScore> pillars = new ConcurrentHashMap<>();
        for (PillarTemplate template : PILLAR_TEMPLATES) {
            pillars.put(template.key(), new MutablePillarScore(
                    template.key(),
                    template.name(),
                    template.maxScore(),
                    template.maxScore(),
                    0
            ));
        }

        if (!coverage.aws()) {
            deduct(pillars, "cost_optimization", 4);
            deduct(pillars, "finops", 6);
        }
        if (!coverage.k8s()) {
            deduct(pillars, "operational_excellence", 3);
            deduct(pillars, "performance_efficiency", 2);
        }
        if (!coverage.prometheus()) {
            deduct(pillars, "operational_excellence", 2);
            deduct(pillars, "reliability", 4);
        }

        for (OptimizationModels.Recommendation recommendation : recommendations) {
            String pillarKey = domainToPillar(recommendation.domain());
            deduct(pillars, pillarKey, riskPenalty(recommendation.riskLevel()));
        }

        List<OptimizationModels.PillarScore> pillarScores = pillars.values().stream()
                .sorted(Comparator.comparing(MutablePillarScore::pillarKey))
                .map(MutablePillarScore::toResponse)
                .toList();

        int totalScore = pillarScores.stream().mapToInt(OptimizationModels.PillarScore::score).sum();
        double confidenceAverage = recommendations.stream()
                .mapToDouble(OptimizationModels.Recommendation::confidenceScore)
                .average()
                .orElse(0.35);
        int confidencePercent = Math.max(35, Math.min(98, (int) Math.round(confidenceAverage * 100)));

        return new OptimizationModels.ScoreBreakdown(
                totalScore,
                gradeForScore(totalScore),
                confidencePercent,
                pillarScores
        );
    }

    private void deduct(Map<String, MutablePillarScore> pillars, String key, int amount) {
        MutablePillarScore pillar = pillars.get(key);
        if (pillar == null || amount <= 0) {
            return;
        }
        pillar.deduction += amount;
        pillar.score = Math.max(0, pillar.score - amount);
    }

    private List<String> buildWarnings(
            OptimizationModels.ProjectSummary project,
            SourceSnapshot sources
    ) {
        List<String> warnings = new ArrayList<>();
        warnings.add("비용 분석은 AWS 서울 리전(" + project.awsRegion() + ") 기준으로 계산됩니다.");
        warnings.addAll(sources.warnings());
        return warnings.stream().distinct().toList();
    }

    private OptimizationModels.CostBreakdownItem findCostItemByCategory(SourceSnapshot sources, String category) {
        return buildCostBreakdown(sources).stream()
                .filter(item -> category.equals(normalizeServiceCategory(item.service())))
                .findFirst()
                .orElse(null);
    }

    private String buildAssistantResponse(
            String workspaceId,
            String analysisId,
            String content,
            String pinnedRecommendationId,
            List<OptimizationModels.ChatMessage> history
    ) {
        OptimizationModels.AnalysisBundle bundle = optimizationPersistenceService
                .findAnalysisBundle(workspaceId, analysisId)
                .orElse(null);
        OptimizationModels.AnalysisSnapshot analysis = bundle == null ? null : bundle.analysis();
        List<OptimizationModels.Recommendation> recommendations = bundle == null ? List.of() : bundle.recommendations();

        OptimizationModels.Recommendation pinned = trimToNull(pinnedRecommendationId) == null
                ? recommendations.stream().findFirst().orElse(null)
                : recommendations.stream()
                .filter(recommendation -> pinnedRecommendationId.equals(recommendation.id()))
                .findFirst()
                .orElse(recommendations.stream().findFirst().orElse(null));

        if (pinned == null) {
            return "아직 분석 결과가 없습니다. 먼저 프로젝트 비용 분석을 실행해 주세요.";
        }

        OptimizationModels.ProjectSummary project = bundle == null
                ? projects.getOrDefault(
                workspaceId,
                new OptimizationModels.ProjectSummary(
                        workspaceId,
                        workspaceId,
                        DEFAULT_OWNER,
                        analysis == null ? AWS_SEOUL_REGION : analysis.awsRegion(),
                        nowIso()
                )
        )
                : bundle.project();

        String llmReply = optimizationLlmService.complete(
                workspaceId,
                analysisId,
                buildAssistantSystemPrompt(),
                buildAssistantUserPrompt(project, analysis, recommendations, pinned, history, content)
        ).orElse(null);
        if (llmReply != null) {
            return llmReply;
        }

        return buildFallbackAssistantResponse(content, analysis, recommendations, pinned, history);
    }

    private String buildAssistantSystemPrompt() {
        return """
                당신은 JeolgamAI의 FinOps/SRE 최적화 어시스턴트다.
                반드시 한국어로 답변하고, 제공된 프로젝트 컨텍스트만 근거로 사용한다.
                숫자, 비용, 리소스명, 명령어, 자격증명, URL을 추측하거나 새로 만들지 않는다.
                실행/롤백 명령은 제공된 commandSnippet과 rollbackSnippet 범위 안에서만 설명한다.
                데이터가 부족하면 부족한 연결(AWS, Kubernetes, Prometheus)을 명시하고 추가 확인이 필요하다고 답한다.
                기본 답변 톤은 보고서가 아니라 동료와 대화하듯 자연스럽고 간결해야 한다.
                사용자가 간단히 물으면 먼저 한두 문장으로 바로 답하고, 필요할 때만 근거와 주의사항을 덧붙인다.
                마크다운 제목(예: #, ##, ###)과 과도한 섹션 구분은 쓰지 않는다.
                bullet 목록은 사용자가 비교, 절차, 명령, 롤백을 물었을 때만 짧게 사용한다.
                """;
    }

    private String buildAssistantUserPrompt(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            List<OptimizationModels.Recommendation> recommendations,
            OptimizationModels.Recommendation pinned,
            List<OptimizationModels.ChatMessage> history,
            String question
    ) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("현재 프로젝트 컨텍스트\n");
        prompt.append("프로젝트명: ").append(project.name()).append('\n');
        prompt.append("workspaceId: ").append(project.id()).append('\n');
        prompt.append("AWS 리전: ").append(project.awsRegion()).append('\n');
        prompt.append("analysisId: ").append(analysis == null ? "unknown" : analysis.id()).append('\n');

        if (analysis != null) {
            prompt.append("분석 점수: ")
                    .append(analysis.score().totalScore())
                    .append("점 (")
                    .append(analysis.score().grade())
                    .append(")\n");
            prompt.append("총 월비용: ").append(formatKrw(analysis.totalMonthlyCost())).append('\n');
            prompt.append("예상 월 절감: ").append(formatKrw(analysis.potentialMonthlySaving())).append('\n');
            prompt.append("예상 연 절감: ").append(formatKrw(analysis.potentialAnnualSaving())).append('\n');
            prompt.append("소스 커버리지: aws=")
                    .append(analysis.sourceCoverage().aws())
                    .append(", k8s=")
                    .append(analysis.sourceCoverage().k8s())
                    .append(", prometheus=")
                    .append(analysis.sourceCoverage().prometheus())
                    .append('\n');
            prompt.append("경고: ")
                    .append(
                            analysis.warnings().isEmpty()
                                    ? "없음"
                                    : analysis.warnings().stream().limit(4).collect(Collectors.joining(" | "))
                    )
                    .append('\n');
            prompt.append("주요 인프라 자원:\n");
            prompt.append(
                    analysis.resources().stream()
                            .limit(5)
                            .map(resource -> "- " + resource.name()
                                    + " [" + resource.type() + "]"
                                    + " status=" + resource.status()
                                    + ", monthlyCost=" + formatKrw(resource.monthlyCost())
                                    + ", cpu="
                                    + (resource.cpuUsagePercent() == null
                                    ? "n/a"
                                    : trimNumeric(resource.cpuUsagePercent()))
                                    + "%, memory="
                                    + (resource.memoryUsagePercent() == null
                                    ? "n/a"
                                    : trimNumeric(resource.memoryUsagePercent()))
                                    + "%")
                            .collect(Collectors.joining("\n"))
            ).append('\n');
        }

        prompt.append("최신 권고 목록:\n");
        prompt.append(
                recommendations.stream()
                        .limit(4)
                        .map(recommendation -> "- " + recommendation.title()
                                + " | target=" + recommendation.targetResource()
                                + " | saving=" + formatKrw(recommendation.estMonthlySaving())
                                + " | risk=" + recommendation.riskLevel()
                                + " | confidence=" + Math.round(recommendation.confidenceScore() * 100) + "%")
                        .collect(Collectors.joining("\n"))
        ).append('\n');

        prompt.append("현재 선택된 권고:\n");
        prompt.append("제목: ").append(pinned.title()).append('\n');
        prompt.append("설명: ").append(pinned.description()).append('\n');
        prompt.append("대상 리소스: ").append(pinned.targetResource()).append('\n');
        prompt.append("리스크: ").append(pinned.riskLevel()).append('\n');
        prompt.append("예상 월 절감: ").append(formatKrw(pinned.estMonthlySaving())).append('\n');
        prompt.append("근거 메트릭: ").append(
                pinned.evidence().metrics().stream()
                        .map(metric -> metric.key() + "=" + trimNumeric(metric.value()) + metric.unit())
                        .collect(Collectors.joining(", "))
        ).append('\n');
        prompt.append("실행 명령: ").append(pinned.commandSnippet()).append('\n');
        prompt.append("롤백 명령: ").append(pinned.rollbackSnippet()).append('\n');
        prompt.append("명령 계열: ").append(detectCommandFamily(pinned.commandSnippet())).append('\n');
        prompt.append("참고 룰: ").append(pinned.ruleTrace().ruleId())
                .append(" / ")
                .append(pinned.ruleTrace().principleName())
                .append('\n');
        prompt.append("참고 문서: ").append(pinned.ruleTrace().awsDocUrl()).append('\n');

        if (!history.isEmpty()) {
            prompt.append("직전 대화 이력:\n");
            prompt.append(
                    history.stream()
                            .skip(Math.max(0, history.size() - 6L))
                            .map(message -> "- " + message.role() + ": " + message.content().replace('\n', ' '))
                            .collect(Collectors.joining("\n"))
            ).append('\n');
        }

        prompt.append("사용자 질문:\n");
        prompt.append(question).append('\n');
        prompt.append("응답 지시:\n");
        prompt.append("- 한국어로 답변한다.\n");
        prompt.append("- 숫자와 명령은 위 컨텍스트에 있는 값만 사용한다.\n");
        prompt.append("- 기본은 대화체로 자연스럽게 답한다. 첫 문장에서 질문에 바로 답한다.\n");
        prompt.append("- 마크다운 제목(#, ##, ###)은 쓰지 않는다.\n");
        prompt.append("- 절차/비교/명령/롤백이 필요할 때만 짧은 bullet을 사용한다.\n");
        prompt.append("- 컨텍스트가 부족하면 부족한 연결과 추가 확인 항목을 분명히 적는다.\n");
        return prompt.toString();
    }

    private String buildFallbackAssistantResponse(
            String question,
            OptimizationModels.AnalysisSnapshot analysis,
            List<OptimizationModels.Recommendation> recommendations,
            OptimizationModels.Recommendation pinned,
            List<OptimizationModels.ChatMessage> history
    ) {
        return """
                지금은 AI 응답을 생성하지 못했습니다.
                잠시 후 다시 시도해 주세요. 계속 같은 상태면 GMS/OpenAI 연결 또는 인증 상태를 먼저 확인해야 합니다.
                """.trim();
    }

    private String detectCommandFamily(String commandSnippet) {
        String normalized = commandSnippet.toLowerCase(Locale.ROOT);
        boolean hasTerraform = normalized.contains("terraform ");
        boolean hasOpenstack = normalized.contains("openstack ");
        boolean hasKubectl = normalized.contains("kubectl ");
        boolean hasAws = normalized.contains("aws ");

        if (hasTerraform && hasOpenstack) {
            return "Terraform + OpenStack";
        }
        if (hasKubectl) {
            return "Kubernetes";
        }
        if (hasAws) {
            return "AWS CLI";
        }
        if (hasTerraform) {
            return "Terraform";
        }
        if (hasOpenstack) {
            return "OpenStack";
        }
        return "Generic";
    }

    private CommandPlan buildPrometheusCommandPlan(
            SourceSnapshot sources,
            OptimizationModels.ProjectSummary project,
            boolean highLatency,
            boolean highError
    ) {
        if (sources.k8s() != null && !sources.k8s().deployments().isEmpty()) {
            K8sInfrastructureResponse.Deployment deployment = sources.k8s().deployments().stream()
                    .max(Comparator.comparing(K8sInfrastructureResponse.Deployment::replicas))
                    .orElse(sources.k8s().deployments().get(0));

            if (highLatency || highError) {
                return new CommandPlan(
                        deployment.namespace() + "/" + deployment.name(),
                        "kubectl set resources deployment " + deployment.name()
                                + " -n " + deployment.namespace()
                                + " --requests=cpu=300m,memory=512Mi --limits=cpu=900m,memory=1024Mi",
                        "kubectl rollout undo deployment/" + deployment.name() + " -n " + deployment.namespace()
                );
            }

            return new CommandPlan(
                    deployment.namespace() + "/" + deployment.name(),
                    "kubectl scale deployment " + deployment.name()
                            + " -n " + deployment.namespace()
                            + " --replicas=" + Math.max(1, deployment.replicas() - 1),
                    "kubectl scale deployment " + deployment.name()
                            + " -n " + deployment.namespace()
                            + " --replicas=" + deployment.replicas()
            );
        }

        if (sources.aws() != null && !sources.aws().resources().isEmpty()) {
            AwsInfrastructureResponse.Resource target = sources.aws().resources().stream()
                    .filter(resource -> "EC2".equalsIgnoreCase(resource.type()))
                    .findFirst()
                    .orElse(sources.aws().resources().get(0));

            if (highLatency || highError) {
                return new CommandPlan(
                        target.id(),
                        "terraform apply -var 'aws_region=" + project.awsRegion()
                                + "' -var 'api_instance_type=m7i.xlarge' -target=module.compute",
                        "terraform apply -var 'aws_region=" + project.awsRegion()
                                + "' -var 'api_instance_type=m7i.large' -target=module.compute"
                );
            }

            return new CommandPlan(
                    target.id(),
                    "terraform apply -var 'aws_region=" + project.awsRegion()
                            + "' -var 'api_desired_capacity=1' -target=module.compute",
                    "terraform apply -var 'aws_region=" + project.awsRegion()
                            + "' -var 'api_desired_capacity=2' -target=module.compute"
            );
        }

        if (highLatency || highError) {
            return new CommandPlan(
                    "openstack/project",
                    "openstack server resize <server-id> --flavor c4.large\nterraform apply -var 'openstack_flavor=c4.large' -target=openstack_compute_instance_v2.app",
                    "openstack server resize <server-id> --flavor c2.large\nterraform apply -var 'openstack_flavor=c2.large' -target=openstack_compute_instance_v2.app"
            );
        }

        return new CommandPlan(
                "openstack/project",
                "openstack server set --property finops_schedule=nightly-stop <server-id>\nterraform apply -var 'nightly_shutdown_enabled=true' -target=openstack_compute_instance_v2.app",
                "openstack server unset --property finops_schedule <server-id>\nterraform apply -var 'nightly_shutdown_enabled=false' -target=openstack_compute_instance_v2.app"
        );
    }

    private void saveAnalysisBundle(OptimizationModels.AnalysisBundle bundle) {
        optimizationPersistenceService.saveAnalysisBundle(bundle);
    }

    private String normalizeServiceCategory(String serviceName) {
        String normalized = serviceName.toLowerCase(Locale.ROOT);
        if (normalized.contains("elastic compute") || normalized.contains("ec2")) {
            return "EC2";
        }
        if (normalized.contains("elastic kubernetes") || normalized.contains("eks")) {
            return "EKS";
        }
        if (normalized.contains("elastic block") || normalized.contains("ebs")) {
            return "S3";
        }
        if (normalized.contains("relational database") || normalized.contains("rds")) {
            return "RDS";
        }
        if (normalized.contains("simple storage") || normalized.contains("s3")) {
            return "S3";
        }
        return serviceName;
    }

    private String normalizeAwsCategory(String type) {
        String normalized = type.toLowerCase(Locale.ROOT);
        if (normalized.contains("ec2")) {
            return "EC2";
        }
        if (normalized.contains("eks")) {
            return "EKS";
        }
        if (normalized.contains("ebs")) {
            return "S3";
        }
        if (normalized.contains("rds")) {
            return "RDS";
        }
        if (normalized.contains("s3")) {
            return "S3";
        }
        return type;
    }

    private String usageTypeForService(String serviceName) {
        return switch (normalizeServiceCategory(serviceName)) {
            case "EC2" -> "On-Demand Instance Usage";
            case "EKS" -> "Cluster Control Plane";
            case "RDS" -> "Provisioned Database";
            case "S3" -> "Standard Storage";
            default -> "Unclassified Usage";
        };
    }

    private String inferRiskLevel(String status, String category, Double cpuUsagePercent) {
        String normalizedStatus = status == null ? "" : status.toLowerCase(Locale.ROOT);
        if (normalizedStatus.contains("unused")) {
            return "critical";
        }
        if (normalizedStatus.contains("warning") || normalizedStatus.contains("error")) {
            return "high";
        }
        if ("EC2".equals(category) && cpuUsagePercent != null && cpuUsagePercent < 20) {
            return "medium";
        }
        return "low";
    }

    private String domainToPillar(String domain) {
        return switch (domain) {
            case "compute" -> "performance_efficiency";
            case "storage" -> "sustainability";
            case "database" -> "reliability";
            case "network" -> "security";
            case "eks" -> "operational_excellence";
            default -> "finops";
        };
    }

    private int riskPenalty(String riskLevel) {
        return switch (riskLevel) {
            case "critical" -> 4;
            case "high" -> 3;
            case "medium" -> 2;
            default -> 1;
        };
    }

    private String gradeForScore(int totalScore) {
        if (totalScore >= 88) {
            return "A";
        }
        if (totalScore >= 76) {
            return "B";
        }
        if (totalScore >= 64) {
            return "C";
        }
        if (totalScore >= 48) {
            return "D";
        }
        return "F";
    }

    private int normalizeLookbackDays(Integer lookbackDays) {
        int resolved = lookbackDays == null ? 30 : lookbackDays;
        if (resolved < 1 || resolved > 365) {
            throw new IllegalArgumentException("lookbackDays는 1~365 범위여야 합니다.");
        }
        return resolved;
    }

    private String normalizeTriggeredBy(String triggeredBy) {
        String normalized = trimToNull(triggeredBy);
        if (normalized == null) {
            return "manual";
        }
        if (!"manual".equals(normalized) && !"scheduled".equals(normalized)) {
            throw new IllegalArgumentException("triggeredBy는 manual 또는 scheduled 이어야 합니다.");
        }
        return normalized;
    }

    private String normalizeApprovalAction(String action) {
        String normalized = trimToNull(action);
        if (normalized == null || (!"approved".equals(normalized) && !"rejected".equals(normalized))) {
            throw new IllegalArgumentException("action은 approved/rejected 이어야 합니다.");
        }
        return normalized;
    }

    private String requireWorkspaceId(String workspaceId) {
        String normalized = trimToNull(workspaceId);
        if (normalized == null) {
            throw new IllegalArgumentException("workspaceId는 필수입니다.");
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String buildChatKey(String workspaceId, String analysisId, String pinnedRecommendationId) {
        return workspaceId + "::" + analysisId + "::" + (pinnedRecommendationId == null ? "-" : pinnedRecommendationId);
    }

    private String createId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private String nowIso() {
        return Instant.now().atZone(ZoneId.of("Asia/Seoul")).format(DISPLAY_DATE_TIME);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String safeMessage(Exception exception) {
        return exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
    }

    private String formatKrw(long value) {
        return String.format(Locale.KOREA, "%,d원", value);
    }

    private String trimNumeric(double value) {
        if (Math.rint(value) == value) {
            return String.valueOf((long) value);
        }
        return String.format(Locale.US, "%.2f", value);
    }

    private record SourceSnapshot(
            OptimizationModels.ProjectSummary project,
            AwsInfrastructureResponse aws,
            K8sInfrastructureResponse k8s,
            PrometheusOverviewResponse prometheus,
            PrometheusCapacitySnapshot prometheusCapacity,
            OptimizationModels.SourceCoverage coverage,
            List<String> warnings
    ) {
    }

    private record CostAverage(
            long totalMonthlyCost,
            int resourceCount
    ) {
    }

    private record CommandPlan(
            String targetResource,
            String commandSnippet,
            String rollbackSnippet
    ) {
    }

    private record PrometheusCostEstimate(
            long ec2MonthlyCost,
            long eksMonthlyCost,
            long ebsMonthlyCost
    ) {
    }

    private record PillarTemplate(
            String key,
            String name,
            int maxScore
    ) {
    }

    private static final class MutablePillarScore {
        private final String pillarKey;
        private final String pillarName;
        private final int maxScore;
        private int score;
        private int deduction;

        private MutablePillarScore(String pillarKey, String pillarName, int maxScore, int score, int deduction) {
            this.pillarKey = pillarKey;
            this.pillarName = pillarName;
            this.maxScore = maxScore;
            this.score = score;
            this.deduction = deduction;
        }

        private String pillarKey() {
            return pillarKey;
        }

        private OptimizationModels.PillarScore toResponse() {
            return new OptimizationModels.PillarScore(
                    pillarKey,
                    pillarName,
                    maxScore,
                    score,
                    deduction
            );
        }
    }

}
