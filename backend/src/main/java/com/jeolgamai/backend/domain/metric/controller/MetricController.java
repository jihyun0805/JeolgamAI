package com.jeolgamai.backend.domain.metric.controller;

import com.jeolgamai.backend.domain.metric.dto.MetricRequest;
import com.jeolgamai.backend.domain.metric.dto.MetricResponse;
import com.jeolgamai.backend.domain.metric.service.MetricService;
import com.jeolgamai.backend.common.dto.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
@Tag(name = "Metric", description = "리소스 지표 관리 API")
public class MetricController {

    private final MetricService metricService;

    @PostMapping
    @Operation(summary = "지표 생성")
    public ResponseEntity<BaseResponse<MetricResponse>> create(
            @Valid @RequestBody MetricRequest request
    ) {
        MetricResponse response = metricService.create(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.onSuccess("지표 생성 성공", response));
    }

    @GetMapping
    @Operation(summary = "지표 전체 조회")
    public ResponseEntity<BaseResponse<List<MetricResponse>>> findAll() {
        List<MetricResponse> response = metricService.findAll();
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "추후 수정될 메시지입니다.",
                        response
                )
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "지표 단건 조회")
    public ResponseEntity<BaseResponse<MetricResponse>> findById(
            @PathVariable Long id
    ) {
        MetricResponse response = metricService.findById(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "추후 수정될 메시지입니다.",
                        response
                )
        );
    }

    @PutMapping("/{id}")
    @Operation(summary = "지표 수정")
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
    @Operation(summary = "지표 삭제")
    public ResponseEntity<BaseResponse<Void>> delete(
            @PathVariable Long id
    ) {
        metricService.delete(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("지표 삭제 성공", null)
        );
    }
}
