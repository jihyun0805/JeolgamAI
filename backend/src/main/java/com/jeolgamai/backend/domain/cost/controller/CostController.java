package com.jeolgamai.backend.domain.cost.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.cost.dto.CostRequest;
import com.jeolgamai.backend.domain.cost.dto.CostResponse;
import com.jeolgamai.backend.domain.cost.dto.MonthlyCostSummaryRequest;
import com.jeolgamai.backend.domain.cost.dto.MonthlyCostSummaryResponse;
import com.jeolgamai.backend.domain.cost.service.CostService;
import com.jeolgamai.backend.common.dto.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/costs")
@RequiredArgsConstructor
@Tag(name = "Cost", description = "리소스 비용 관리 API")
public class CostController {

    private final CostService costService;

    @PostMapping
    public ResponseEntity<BaseResponse<CostResponse>> create(
            @Valid @RequestBody CostRequest request
    ) {
        CostResponse response = costService.create(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.onSuccess("Cost created successfully", response));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<CostResponse>>> findAll() {
        List<CostResponse> response = costService.findAll();
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "Costs retrieved successfully",
                        response
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<CostResponse>> findById(
            @PathVariable Long id
    ) {
        CostResponse response = costService.findById(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "Cost retrieved successfully",
                        response
                )
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<CostResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CostRequest request
    ) {
        CostResponse response = costService.update(id, request);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("Cost updated successfully", response)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> delete(
            @PathVariable Long id
    ) {
        costService.delete(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("Cost deleted successfully", null)
        );
    }

    @PostMapping("/monthly-total")
    public ResponseEntity<BaseResponse<MonthlyCostSummaryResponse>> getMonthlyTotal(
            @Valid @RequestBody MonthlyCostSummaryRequest request
    ) {
        MonthlyCostSummaryResponse response = costService.getMonthlyTotal(request);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("Monthly total cost fetched", response)
        );
    }
}
