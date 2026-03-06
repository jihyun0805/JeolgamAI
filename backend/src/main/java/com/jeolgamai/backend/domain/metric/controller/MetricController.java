package com.jeolgamai.backend.domain.metric.controller;

import com.jeolgamai.backend.domain.metric.dto.MetricRequest;
import com.jeolgamai.backend.domain.metric.dto.MetricResponse;
import com.jeolgamai.backend.domain.metric.service.MetricService;
import com.jeolgamai.backend.global.response.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
public class MetricController {

    private final MetricService metricService;

    @PostMapping
    public ResponseEntity<BaseResponse<MetricResponse>> create(
            @Valid @RequestBody MetricRequest request
    ) {
        MetricResponse response = metricService.create(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.onSuccess("지표 생성 성공", response));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<MetricResponse>>> findAll() {
        List<MetricResponse> response = metricService.findAll();
        return ResponseEntity.ok(
                BaseResponse.onSuccess(response)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<MetricResponse>> findById(
            @PathVariable Long id
    ) {
        MetricResponse response = metricService.findById(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess(response)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<MetricResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody MetricRequest request
    ) {
        MetricResponse response = metricService.update(id, request);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("지표 수정 성공", response)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> delete(
            @PathVariable Long id
    ) {
        metricService.delete(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("지표 삭제 성공", null)
        );
    }
}