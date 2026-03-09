package com.jeolgamai.backend.domain.cost.controller;

import com.jeolgamai.backend.domain.cost.dto.CostRequest;
import com.jeolgamai.backend.domain.cost.dto.CostResponse;
import com.jeolgamai.backend.domain.cost.service.CostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
@RequestMapping("/api/costs")
@RequiredArgsConstructor
@Tag(name = "Cost", description = "리소스 비용 관리 API")
public class CostController {

    private final CostService costService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "비용 생성")
    public CostResponse create(@Valid @RequestBody CostRequest request) {
        return costService.create(request);
    }

    @GetMapping
    @Operation(summary = "비용 전체 조회")
    public List<CostResponse> findAll() {
        return costService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "비용 단건 조회")
    public CostResponse findById(@PathVariable Long id) {
        return costService.findById(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "비용 수정")
    public CostResponse update(@PathVariable Long id, @Valid @RequestBody CostRequest request) {
        return costService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "비용 삭제")
    public void delete(@PathVariable Long id) {
        costService.delete(id);
    }
}
