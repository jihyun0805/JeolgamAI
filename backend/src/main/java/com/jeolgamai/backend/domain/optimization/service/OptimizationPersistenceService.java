package com.jeolgamai.backend.domain.optimization.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeolgamai.backend.domain.optimization.dto.OptimizationModels;
import com.jeolgamai.backend.domain.optimization.entity.OptimizationAnalysisRecord;
import com.jeolgamai.backend.domain.optimization.entity.OptimizationApprovalLogRecord;
import com.jeolgamai.backend.domain.optimization.entity.OptimizationChatMessageRecord;
import com.jeolgamai.backend.domain.optimization.entity.OptimizationChatSessionRecord;
import com.jeolgamai.backend.domain.optimization.entity.OptimizationNotificationRecord;
import com.jeolgamai.backend.domain.optimization.entity.OptimizationRecommendationRecord;
import com.jeolgamai.backend.domain.optimization.entity.OptimizationReportRecord;
import com.jeolgamai.backend.domain.optimization.repository.OptimizationAnalysisRecordRepository;
import com.jeolgamai.backend.domain.optimization.repository.OptimizationApprovalLogRecordRepository;
import com.jeolgamai.backend.domain.optimization.repository.OptimizationChatMessageRecordRepository;
import com.jeolgamai.backend.domain.optimization.repository.OptimizationChatSessionRecordRepository;
import com.jeolgamai.backend.domain.optimization.repository.OptimizationNotificationRecordRepository;
import com.jeolgamai.backend.domain.optimization.repository.OptimizationRecommendationRecordRepository;
import com.jeolgamai.backend.domain.optimization.repository.OptimizationReportRecordRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OptimizationPersistenceService {

    private static final TypeReference<OptimizationModels.SourceCoverage> SOURCE_COVERAGE_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<OptimizationModels.ScoreBreakdown> SCORE_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<OptimizationModels.InfrastructureResource>> RESOURCE_LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<OptimizationModels.CostBreakdownItem>> COST_BREAKDOWN_LIST_TYPE =
            new TypeReference<>() {
            };
    private static final TypeReference<OptimizationModels.RecommendationEvidence> EVIDENCE_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<OptimizationModels.RuleTrace> RULE_TRACE_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<OptimizationModels.ReportPayload> REPORT_PAYLOAD_TYPE = new TypeReference<>() {
    };

    private final OptimizationAnalysisRecordRepository analysisRepository;
    private final OptimizationRecommendationRecordRepository recommendationRepository;
    private final OptimizationApprovalLogRecordRepository approvalLogRepository;
    private final OptimizationChatSessionRecordRepository chatSessionRepository;
    private final OptimizationChatMessageRecordRepository chatMessageRepository;
    private final OptimizationNotificationRecordRepository notificationRepository;
    private final OptimizationReportRecordRepository reportRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void saveAnalysisBundle(OptimizationModels.AnalysisBundle bundle) {
        if (bundle.analysis() == null) {
            return;
        }

        analysisRepository.save(toAnalysisRecord(bundle.project(), bundle.analysis()));
        recommendationRepository.saveAll(
                bundle.recommendations().stream()
                        .map(this::toRecommendationRecord)
                        .toList()
        );
    }

    public Optional<OptimizationModels.AnalysisBundle> findLatestAnalysisBundle(String workspaceId) {
        return analysisRepository.findTopByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .map(this::toAnalysisBundle);
    }

    public Optional<OptimizationModels.AnalysisBundle> findAnalysisBundle(String workspaceId, String analysisId) {
        return analysisRepository.findByIdAndWorkspaceId(analysisId, workspaceId)
                .map(this::toAnalysisBundle);
    }

    public Optional<OptimizationModels.Recommendation> findRecommendation(String workspaceId, String recommendationId) {
        return recommendationRepository.findByIdAndWorkspaceId(recommendationId, workspaceId)
                .map(this::toRecommendation);
    }

    @Transactional
    public OptimizationModels.Recommendation saveRecommendation(OptimizationModels.Recommendation recommendation) {
        OptimizationRecommendationRecord saved = recommendationRepository.save(toRecommendationRecord(recommendation));
        return toRecommendation(saved);
    }

    @Transactional
    public OptimizationModels.ApprovalLog saveApprovalLog(OptimizationModels.ApprovalLog log) {
        OptimizationApprovalLogRecord saved = approvalLogRepository.save(toApprovalLogRecord(log));
        return toApprovalLog(saved);
    }

    public boolean analysisExists(String workspaceId, String analysisId) {
        return analysisRepository.existsByIdAndWorkspaceId(analysisId, workspaceId);
    }

    @Transactional
    public OptimizationModels.ReportArtifact saveReport(OptimizationModels.ReportArtifact report) {
        return toReport(reportRepository.save(toReportRecord(report)));
    }

    public List<OptimizationModels.ReportArtifact> listReports(String workspaceId, String analysisId) {
        if (analysisId == null || analysisId.isBlank()) {
            return reportRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                    .stream()
                    .map(this::toReport)
                    .toList();
        }

        return reportRepository.findByWorkspaceIdAndAnalysisIdOrderByCreatedAtDesc(workspaceId, analysisId)
                .stream()
                .map(this::toReport)
                .toList();
    }

    public Optional<OptimizationModels.ReportArtifact> findReport(String workspaceId, String reportId) {
        return reportRepository.findByIdAndWorkspaceId(reportId, workspaceId)
                .map(this::toReport);
    }

    public Optional<OptimizationModels.ReportArtifact> findLatestReportByAnalysis(String workspaceId, String analysisId) {
        return reportRepository.findTopByWorkspaceIdAndAnalysisIdOrderByCreatedAtDesc(workspaceId, analysisId)
                .map(this::toReport);
    }

    @Transactional
    public OptimizationModels.AppNotification saveNotification(OptimizationModels.AppNotification notification) {
        return toNotification(notificationRepository.save(toNotificationRecord(notification)));
    }

    public OptimizationModels.NotificationList listNotifications(String workspaceId) {
        List<OptimizationModels.AppNotification> notifications = notificationRepository
                .findTop20ByWorkspaceIdAndReadFalseOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(this::toNotification)
                .toList();
        long unreadCount = notificationRepository.countByWorkspaceIdAndReadFalse(workspaceId);
        return new OptimizationModels.NotificationList(notifications, unreadCount);
    }

    @Transactional
    public OptimizationModels.NotificationList markNotificationsRead(String workspaceId, List<String> notificationIds) {
        List<OptimizationNotificationRecord> targets;
        if (notificationIds == null || notificationIds.isEmpty()) {
            targets = notificationRepository.findByWorkspaceIdAndReadFalseOrderByCreatedAtDesc(workspaceId);
        } else {
            targets = notificationRepository.findByWorkspaceIdAndIdIn(workspaceId, notificationIds);
        }

        if (!targets.isEmpty()) {
            for (OptimizationNotificationRecord target : targets) {
                target.setRead(true);
            }
            notificationRepository.saveAll(targets);
        }

        return listNotifications(workspaceId);
    }

    @Transactional
    public OptimizationModels.ChatSession getOrCreateChatSession(
            String sessionId,
            String workspaceId,
            String analysisId,
            String pinnedRecommendationId,
            String updatedAt
    ) {
        OptimizationChatSessionRecord record = chatSessionRepository.findById(sessionId)
                .orElseGet(() -> {
                    OptimizationChatSessionRecord created = new OptimizationChatSessionRecord();
                    created.setId(sessionId);
                    created.setWorkspaceId(workspaceId);
                    created.setAnalysisId(analysisId);
                    created.setPinnedRecommendationId(pinnedRecommendationId);
                    created.setUpdatedAt(updatedAt);
                    return chatSessionRepository.save(created);
                });
        return toChatSession(record);
    }

    @Transactional
    public OptimizationModels.ChatSession appendChatMessages(
            String sessionId,
            List<OptimizationModels.ChatMessage> newMessages,
            String updatedAt
    ) {
        OptimizationChatSessionRecord sessionRecord = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("chatSessionId=" + sessionId + "를 찾을 수 없습니다."));

        long nextSequence = chatMessageRepository.countBySessionId(sessionId) + 1;
        List<OptimizationChatMessageRecord> messageRecords = new java.util.ArrayList<>(newMessages.size());
        for (OptimizationModels.ChatMessage message : newMessages) {
            messageRecords.add(
                    toChatMessageRecord(
                            sessionRecord.getWorkspaceId(),
                            sessionId,
                            message,
                            nextSequence
                    )
            );
            nextSequence++;
        }

        chatMessageRepository.saveAll(messageRecords);
        sessionRecord.setUpdatedAt(updatedAt);
        chatSessionRepository.save(sessionRecord);
        return toChatSession(sessionRecord);
    }

    private OptimizationModels.AnalysisBundle toAnalysisBundle(OptimizationAnalysisRecord record) {
        OptimizationModels.AnalysisSnapshot analysis = toAnalysisSnapshot(record);
        List<OptimizationModels.Recommendation> recommendations = recommendationRepository.findByAnalysisId(record.getId())
                .stream()
                .map(this::toRecommendation)
                .sorted(Comparator.comparingLong(OptimizationModels.Recommendation::estMonthlySaving).reversed())
                .toList();

        return new OptimizationModels.AnalysisBundle(
                record.getWorkspaceId(),
                new OptimizationModels.ProjectSummary(
                        record.getProjectId(),
                        record.getProjectName(),
                        record.getProjectOwnerUserId(),
                        record.getAwsRegion(),
                        record.getProjectCreatedAt()
                ),
                analysis,
                recommendations
        );
    }

    private OptimizationAnalysisRecord toAnalysisRecord(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis
    ) {
        OptimizationAnalysisRecord record = new OptimizationAnalysisRecord();
        record.setId(analysis.id());
        record.setWorkspaceId(analysis.workspaceId());
        record.setProjectId(project.id());
        record.setProjectName(project.name());
        record.setProjectOwnerUserId(project.ownerUserId());
        record.setProjectCreatedAt(project.createdAt());
        record.setTriggeredBy(analysis.triggeredBy());
        record.setStatus(analysis.status());
        record.setCreatedAt(analysis.createdAt());
        record.setStartedAt(analysis.startedAt());
        record.setCompletedAt(analysis.completedAt());
        record.setLookbackDays(analysis.lookbackDays());
        record.setPeriodStart(analysis.periodStart());
        record.setPeriodEnd(analysis.periodEnd());
        record.setAwsRegion(analysis.awsRegion());
        record.setSourceCoverageJson(writeJson(analysis.sourceCoverage()));
        record.setTotalMonthlyCost(analysis.totalMonthlyCost());
        record.setWasteCost(analysis.wasteCost());
        record.setPotentialMonthlySaving(analysis.potentialMonthlySaving());
        record.setPotentialAnnualSaving(analysis.potentialAnnualSaving());
        record.setScoreJson(writeJson(analysis.score()));
        record.setRecommendationIdsJson(writeJson(analysis.recommendationIds()));
        record.setResourcesJson(writeJson(analysis.resources()));
        record.setCostBreakdownJson(writeJson(analysis.costBreakdown()));
        record.setWarningsJson(writeJson(analysis.warnings()));
        record.setExecutiveSummary(analysis.executiveSummary());
        return record;
    }

    private OptimizationModels.AnalysisSnapshot toAnalysisSnapshot(OptimizationAnalysisRecord record) {
        return new OptimizationModels.AnalysisSnapshot(
                record.getId(),
                record.getWorkspaceId(),
                record.getTriggeredBy(),
                record.getStatus(),
                record.getCreatedAt(),
                record.getStartedAt(),
                record.getCompletedAt(),
                record.getLookbackDays(),
                record.getPeriodStart(),
                record.getPeriodEnd(),
                record.getAwsRegion(),
                readJson(record.getSourceCoverageJson(), SOURCE_COVERAGE_TYPE),
                record.getTotalMonthlyCost(),
                record.getWasteCost(),
                record.getPotentialMonthlySaving(),
                record.getPotentialAnnualSaving(),
                readJson(record.getScoreJson(), SCORE_TYPE),
                readJson(record.getRecommendationIdsJson(), STRING_LIST_TYPE),
                readJson(record.getResourcesJson(), RESOURCE_LIST_TYPE),
                readJson(record.getCostBreakdownJson(), COST_BREAKDOWN_LIST_TYPE),
                readJson(record.getWarningsJson(), STRING_LIST_TYPE),
                record.getExecutiveSummary()
        );
    }

    private OptimizationRecommendationRecord toRecommendationRecord(OptimizationModels.Recommendation recommendation) {
        OptimizationRecommendationRecord record = new OptimizationRecommendationRecord();
        record.setId(recommendation.id());
        record.setAnalysisId(recommendation.analysisId());
        record.setWorkspaceId(recommendation.workspaceId());
        record.setDomain(recommendation.domain());
        record.setTitle(recommendation.title());
        record.setDescription(recommendation.description());
        record.setTargetResource(recommendation.targetResource());
        record.setStatus(recommendation.status());
        record.setConfidenceScore(recommendation.confidenceScore());
        record.setRiskLevel(recommendation.riskLevel());
        record.setEstMonthlySaving(recommendation.estMonthlySaving());
        record.setEstAnnualSaving(recommendation.estAnnualSaving());
        record.setCommandSnippet(recommendation.commandSnippet());
        record.setRollbackSnippet(recommendation.rollbackSnippet());
        record.setEvidenceJson(writeJson(recommendation.evidence()));
        record.setRuleTraceJson(writeJson(recommendation.ruleTrace()));
        record.setCreatedAt(recommendation.createdAt());
        record.setUpdatedAt(recommendation.updatedAt());
        record.setRationale(recommendation.rationale());
        return record;
    }

    private OptimizationModels.Recommendation toRecommendation(OptimizationRecommendationRecord record) {
        return new OptimizationModels.Recommendation(
                record.getId(),
                record.getAnalysisId(),
                record.getWorkspaceId(),
                record.getDomain(),
                record.getTitle(),
                record.getDescription(),
                record.getTargetResource(),
                record.getStatus(),
                record.getConfidenceScore(),
                record.getRiskLevel(),
                record.getEstMonthlySaving(),
                record.getEstAnnualSaving(),
                record.getCommandSnippet(),
                record.getRollbackSnippet(),
                readJson(record.getEvidenceJson(), EVIDENCE_TYPE),
                readJson(record.getRuleTraceJson(), RULE_TRACE_TYPE),
                record.getCreatedAt(),
                record.getUpdatedAt(),
                record.getRationale()
        );
    }

    private OptimizationApprovalLogRecord toApprovalLogRecord(OptimizationModels.ApprovalLog log) {
        OptimizationApprovalLogRecord record = new OptimizationApprovalLogRecord();
        record.setId(log.id());
        record.setWorkspaceId(log.workspaceId());
        record.setRecommendationId(log.recommendationId());
        record.setActor(log.actor());
        record.setAction(log.action());
        record.setNote(log.note());
        record.setCreatedAt(log.createdAt());
        return record;
    }

    private OptimizationModels.ApprovalLog toApprovalLog(OptimizationApprovalLogRecord record) {
        return new OptimizationModels.ApprovalLog(
                record.getId(),
                record.getWorkspaceId(),
                record.getRecommendationId(),
                record.getActor(),
                record.getAction(),
                record.getNote(),
                record.getCreatedAt()
        );
    }

    private OptimizationModels.ChatSession toChatSession(OptimizationChatSessionRecord record) {
        List<OptimizationModels.ChatMessage> messages = chatMessageRepository.findBySessionIdOrderBySequenceNoAsc(record.getId())
                .stream()
                .map(this::toChatMessage)
                .toList();

        return new OptimizationModels.ChatSession(
                record.getId(),
                record.getWorkspaceId(),
                record.getAnalysisId(),
                record.getPinnedRecommendationId(),
                messages,
                record.getUpdatedAt()
        );
    }

    private OptimizationChatMessageRecord toChatMessageRecord(
            String workspaceId,
            String sessionId,
            OptimizationModels.ChatMessage message,
            long sequenceNo
    ) {
        OptimizationChatMessageRecord record = new OptimizationChatMessageRecord();
        record.setId(message.id());
        record.setSessionId(sessionId);
        record.setWorkspaceId(workspaceId);
        record.setRole(message.role());
        record.setContent(message.content());
        record.setCreatedAt(message.createdAt());
        record.setSequenceNo(sequenceNo);
        return record;
    }

    private OptimizationModels.ChatMessage toChatMessage(OptimizationChatMessageRecord record) {
        return new OptimizationModels.ChatMessage(
                record.getId(),
                record.getRole(),
                record.getContent(),
                record.getCreatedAt()
        );
    }

    private OptimizationReportRecord toReportRecord(OptimizationModels.ReportArtifact report) {
        OptimizationReportRecord record = new OptimizationReportRecord();
        record.setId(report.id());
        record.setWorkspaceId(report.workspaceId());
        record.setAnalysisId(report.analysisId());
        record.setTemplateType(report.templateType());
        record.setCreatedBy(report.createdBy());
        record.setCreatedAt(report.createdAt());
        record.setPreviewUrl(report.previewUrl());
        record.setExportUrl(report.exportUrl());
        record.setPayloadJson(writeJson(report.payload()));
        return record;
    }

    private OptimizationModels.ReportArtifact toReport(OptimizationReportRecord record) {
        return new OptimizationModels.ReportArtifact(
                record.getId(),
                record.getWorkspaceId(),
                record.getAnalysisId(),
                record.getTemplateType(),
                record.getCreatedBy(),
                record.getCreatedAt(),
                record.getPreviewUrl(),
                record.getExportUrl(),
                readJson(record.getPayloadJson(), REPORT_PAYLOAD_TYPE)
        );
    }

    private OptimizationNotificationRecord toNotificationRecord(OptimizationModels.AppNotification notification) {
        OptimizationNotificationRecord record = new OptimizationNotificationRecord();
        record.setId(notification.id());
        record.setWorkspaceId(notification.workspaceId());
        record.setSeverity(notification.severity());
        record.setTitle(notification.title());
        record.setBody(notification.body());
        record.setAnalysisId(notification.analysisId());
        record.setReportId(notification.reportId());
        record.setCreatedAt(notification.createdAt());
        record.setRead(notification.read());
        return record;
    }

    private OptimizationModels.AppNotification toNotification(OptimizationNotificationRecord record) {
        return new OptimizationModels.AppNotification(
                record.getId(),
                record.getWorkspaceId(),
                record.getSeverity(),
                record.getTitle(),
                record.getBody(),
                record.getAnalysisId(),
                record.getReportId(),
                record.getCreatedAt(),
                record.isRead()
        );
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("optimization persistence serialize 실패", exception);
        }
    }

    private <T> T readJson(String value, TypeReference<T> typeReference) {
        try {
            return objectMapper.readValue(value, typeReference);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("optimization persistence deserialize 실패", exception);
        }
    }
}
