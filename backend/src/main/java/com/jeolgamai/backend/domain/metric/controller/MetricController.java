package com.jeolgamai.backend.domain.metric.controller;

import com.jeolgamai.backend.domain.metric.dto.MetricRequest;
import com.jeolgamai.backend.domain.metric.dto.MetricResponse;
import com.jeolgamai.backend.domain.metric.service.MetricService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/metrics")
public class MetricController {

    private final MetricService metricService;

    public MetricController(MetricService metricService) {
        this.metricService = metricService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MetricResponse create(@Valid @RequestBody MetricRequest request) {
        return metricService.create(request);
    }

    @GetMapping
    public List<MetricResponse> findAll() {
        return metricService.findAll();
    }

    @GetMapping("/{id}")
    public MetricResponse findById(@PathVariable Long id) {
        return metricService.findById(id);
    }

    @PutMapping("/{id}")
    public MetricResponse update(@PathVariable Long id, @Valid @RequestBody MetricRequest request) {
        return metricService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        metricService.delete(id);
    }
}
