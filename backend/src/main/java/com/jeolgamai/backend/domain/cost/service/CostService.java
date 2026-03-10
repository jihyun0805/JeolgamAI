package com.jeolgamai.backend.domain.cost.service;

import com.jeolgamai.backend.domain.cost.dto.CostRequest;
import com.jeolgamai.backend.domain.cost.dto.CostResponse;
import com.jeolgamai.backend.domain.cost.dto.MonthlyCostSummaryRequest;
import com.jeolgamai.backend.domain.cost.dto.MonthlyCostSummaryResponse;
import com.jeolgamai.backend.domain.cost.entity.Cost;
import com.jeolgamai.backend.domain.cost.entity.IntegrationType;
import com.jeolgamai.backend.domain.cost.repository.CostRepository;
import com.jeolgamai.backend.domain.resource.entity.Resource;
import com.jeolgamai.backend.domain.resource.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CostService {

    private final CostRepository costRepository;
    private final ResourceRepository resourceRepository;

    public CostResponse create(CostRequest request) {
        Resource resource = getResourceById(request.getResourceId());
        Cost saved = costRepository.save(new Cost(resource, request.getMonthlyCost()));
        return toResponse(saved);
    }

    public List<CostResponse> findAll() {
        return costRepository.findAll().stream().map(this::toResponse).toList();
    }

    public CostResponse findById(Long id) {
        return toResponse(getById(id));
    }

    public CostResponse update(Long id, CostRequest request) {
        Cost cost = getById(id);
        cost.setResource(getResourceById(request.getResourceId()));
        cost.setMonthlyCost(request.getMonthlyCost());
        return toResponse(costRepository.save(cost));
    }

    public void delete(Long id) {
        if (!costRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cost not found: " + id);
        }
        costRepository.deleteById(id);
    }

    public MonthlyCostSummaryResponse getMonthlyTotal(MonthlyCostSummaryRequest request) {
        String project = request.getProject().trim();
        if (project.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project is required");
        }

        List<String> integrations = normalizeIntegrations(request.getIntegrations());
        Double total = costRepository.sumMonthlyCostByProjectAndServices(project, integrations);

        return new MonthlyCostSummaryResponse(project, integrations, total == null ? 0.0 : total);
    }

    private Cost getById(Long id) {
        return costRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cost not found: " + id));
    }

    private CostResponse toResponse(Cost cost) {
        return new CostResponse(cost.getId(), cost.getResource().getId(), cost.getMonthlyCost());
    }

    private Resource getResourceById(Long resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found: " + resourceId));
    }

    private List<String> normalizeIntegrations(List<String> rawIntegrations) {
        if (rawIntegrations == null || rawIntegrations.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Integrations must be between 1 and 3 unique values");
        }

        Set<String> normalized = new LinkedHashSet<>();

        for (String rawIntegration : rawIntegrations) {
            try {
                normalized.add(IntegrationType.from(rawIntegration).getServiceName());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
            }
        }

        if (normalized.isEmpty() || normalized.size() > 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Integrations must be between 1 and 3 unique values");
        }

        return List.copyOf(normalized);
    }
}
