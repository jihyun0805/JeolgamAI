package com.jeolgamai.backend.domain.recommend.service;

import com.jeolgamai.backend.domain.recommend.dto.RecommendRequest;
import com.jeolgamai.backend.domain.recommend.dto.RecommendResponse;
import com.jeolgamai.backend.domain.recommend.entity.Recommend;
import com.jeolgamai.backend.domain.recommend.repository.RecommendRepository;
import com.jeolgamai.backend.domain.metric.entity.Metric;
import com.jeolgamai.backend.domain.metric.repository.MetricRepository;
import com.jeolgamai.backend.domain.cost.entity.Cost;
import com.jeolgamai.backend.domain.cost.repository.CostRepository;
import com.jeolgamai.backend.domain.resource.entity.Resource;
import com.jeolgamai.backend.domain.resource.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecommendService {

    private final RecommendRepository recommendRepository;
    private final ResourceRepository resourceRepository;
    private final MetricRepository metricRepository;
    private final CostRepository costRepository;
    private final SavingsCalculator savingsCalculator;

    public RecommendResponse create(RecommendRequest request) {
        Resource resource = getResourceById(request.getResourceId());
        Recommend saved = recommendRepository.save(new Recommend(
                resource,
                request.getEstimatedSavings(),
                request.getRiskScore(),
                request.getFeasibilityScore(),
                request.getPriorityScore(),
                request.getStatus()
        ));
        return toResponse(saved);
    }

    public RecommendResponse generateFromResource(Long resourceId) {
        Resource resource = getResourceById(resourceId);
        Metric metric = metricRepository.findFirstByResourceIdOrderByIdDesc(resourceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Metric not found for resource: " + resourceId));
        Cost cost = costRepository.findFirstByResourceIdOrderByIdDesc(resourceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cost not found for resource: " + resourceId));

        double estimatedSavings = savingsCalculator.calculateEstimatedSavings(cost.getMonthlyCost(), metric.getCpuAvg());
        double riskScore = calculateRiskScore(metric.getCpuAvg());
        double feasibilityScore = calculateFeasibilityScore(metric.getCpuAvg(), metric.getMemoryAvg());
        double priorityScore = calculatePriorityScore(estimatedSavings, riskScore, feasibilityScore);

        Recommend saved = recommendRepository.save(new Recommend(
                resource,
                estimatedSavings,
                riskScore,
                feasibilityScore,
                priorityScore,
                "NEW"
        ));

        return toResponse(saved);
    }

    public List<RecommendResponse> findAll() {
        return recommendRepository.findAll().stream().map(this::toResponse).toList();
    }

    public RecommendResponse findById(Long id) {
        return toResponse(getById(id));
    }

    public RecommendResponse update(Long id, RecommendRequest request) {
        Recommend recommend = getById(id);
        recommend.setResource(getResourceById(request.getResourceId()));
        recommend.setEstimatedSavings(request.getEstimatedSavings());
        recommend.setRiskScore(request.getRiskScore());
        recommend.setFeasibilityScore(request.getFeasibilityScore());
        recommend.setPriorityScore(request.getPriorityScore());
        recommend.setStatus(request.getStatus());
        return toResponse(recommendRepository.save(recommend));
    }

    public void delete(Long id) {
        if (!recommendRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recommendation not found: " + id);
        }
        recommendRepository.deleteById(id);
    }

    private Recommend getById(Long id) {
        return recommendRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recommendation not found: " + id));
    }

    private RecommendResponse toResponse(Recommend recommend) {
        return new RecommendResponse(
                recommend.getId(),
                recommend.getResource().getId(),
                recommend.getEstimatedSavings(),
                recommend.getRiskScore(),
                recommend.getFeasibilityScore(),
                recommend.getPriorityScore(),
                recommend.getStatus()
        );
    }

    private Resource getResourceById(Long resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found: " + resourceId));
    }

    private double calculateRiskScore(double cpuAvg) {
        if (cpuAvg < 20) {
            return 20.0;
        }
        if (cpuAvg <= 40) {
            return 40.0;
        }
        return 70.0;
    }

    private double calculateFeasibilityScore(double cpuAvg, double memoryAvg) {
        double score = 100.0 - (cpuAvg * 0.4 + memoryAvg * 0.3);
        return clamp(roundToTwoDecimals(score), 0.0, 100.0);
    }

    private double calculatePriorityScore(double estimatedSavings, double riskScore, double feasibilityScore) {
        double normalizedSavings = Math.min(estimatedSavings / 1000.0 * 100.0, 100.0);
        double score = normalizedSavings * 0.5 + feasibilityScore * 0.3 + (100.0 - riskScore) * 0.2;
        return clamp(roundToTwoDecimals(score), 0.0, 100.0);
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
