package com.jeolgamai.backend.domain.cost.service;

import com.jeolgamai.backend.domain.cost.dto.CostRequest;
import com.jeolgamai.backend.domain.cost.dto.CostResponse;
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
}
