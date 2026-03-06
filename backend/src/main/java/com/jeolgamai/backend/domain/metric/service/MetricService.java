package com.jeolgamai.backend.domain.metric.service;

import com.jeolgamai.backend.domain.metric.dto.MetricRequest;
import com.jeolgamai.backend.domain.metric.dto.MetricResponse;
import com.jeolgamai.backend.domain.metric.entity.Metric;
import com.jeolgamai.backend.domain.metric.repository.MetricRepository;
import com.jeolgamai.backend.domain.resource.entity.Resource;
import com.jeolgamai.backend.domain.resource.repository.ResourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class MetricService {

    private final MetricRepository metricRepository;
    private final ResourceRepository resourceRepository;

    public MetricService(MetricRepository metricRepository, ResourceRepository resourceRepository) {
        this.metricRepository = metricRepository;
        this.resourceRepository = resourceRepository;
    }

    public MetricResponse create(MetricRequest request) {
        Resource resource = getResourceById(request.resourceId());
        Metric saved = metricRepository.save(new Metric(resource, request.cpuAvg(), request.memoryAvg()));
        return toResponse(saved);
    }

    public List<MetricResponse> findAll() {
        return metricRepository.findAll().stream().map(this::toResponse).toList();
    }

    public MetricResponse findById(Long id) {
        return toResponse(getById(id));
    }

    public MetricResponse update(Long id, MetricRequest request) {
        Metric metric = getById(id);
        metric.setResource(getResourceById(request.resourceId()));
        metric.setCpuAvg(request.cpuAvg());
        metric.setMemoryAvg(request.memoryAvg());
        return toResponse(metricRepository.save(metric));
    }

    public void delete(Long id) {
        if (!metricRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Metric not found: " + id);
        }
        metricRepository.deleteById(id);
    }

    private Metric getById(Long id) {
        return metricRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Metric not found: " + id));
    }

    private MetricResponse toResponse(Metric metric) {
        return new MetricResponse(metric.getId(), metric.getResource().getId(), metric.getCpuAvg(), metric.getMemoryAvg());
    }

    private Resource getResourceById(Long resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found: " + resourceId));
    }
}
