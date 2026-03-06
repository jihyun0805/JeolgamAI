package com.jeolgamai.backend.domain.recommend.service;

import com.jeolgamai.backend.domain.recommend.dto.RecommendRequest;
import com.jeolgamai.backend.domain.recommend.dto.RecommendResponse;
import com.jeolgamai.backend.domain.recommend.entity.Recommend;
import com.jeolgamai.backend.domain.recommend.repository.RecommendRepository;
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
}
