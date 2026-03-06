package com.jeolgamai.backend.domain.recommend.controller;

import com.jeolgamai.backend.domain.recommend.dto.RecommendRequest;
import com.jeolgamai.backend.domain.recommend.dto.RecommendResponse;
import com.jeolgamai.backend.domain.recommend.service.RecommendService;
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
@RequestMapping("/api/recommendations")
public class RecommendController {

    private final RecommendService recommendService;

    public RecommendController(RecommendService recommendService) {
        this.recommendService = recommendService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecommendResponse create(@Valid @RequestBody RecommendRequest request) {
        return recommendService.create(request);
    }

    @GetMapping
    public List<RecommendResponse> findAll() {
        return recommendService.findAll();
    }

    @GetMapping("/{id}")
    public RecommendResponse findById(@PathVariable Long id) {
        return recommendService.findById(id);
    }

    @PutMapping("/{id}")
    public RecommendResponse update(@PathVariable Long id, @Valid @RequestBody RecommendRequest request) {
        return recommendService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        recommendService.delete(id);
    }
}
