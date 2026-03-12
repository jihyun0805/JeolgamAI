package com.jeolgamai.backend.domain.resource.controller;

import com.jeolgamai.backend.domain.resource.dto.ResourceRequest;
import com.jeolgamai.backend.domain.resource.dto.ResourceResponse;
import com.jeolgamai.backend.domain.resource.service.ResourceService;
import com.jeolgamai.backend.common.dto.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@Tag(name = "Resource", description = "리소스 관리 API")
public class ResourceController {

    private final ResourceService resourceService;

    @PostMapping
    @Operation(summary = "리소스 생성")
    public ResponseEntity<BaseResponse<ResourceResponse>> create(
            @Valid @RequestBody ResourceRequest request
    ) {
        ResourceResponse response = resourceService.create(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.onSuccess("리소스 생성 성공", response));
    }

    @GetMapping
    @Operation(summary = "리소스 전체 조회")
    public ResponseEntity<BaseResponse<List<ResourceResponse>>> findAll() {
        List<ResourceResponse> response = resourceService.findAll();
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "추후 수정될 메시지입니다.",
                        response
                )
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "리소스 단건 조회")
    public ResponseEntity<BaseResponse<ResourceResponse>> findById(
            @PathVariable Long id
    ) {
        ResourceResponse response = resourceService.findById(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "추후 수정될 메시지입니다.",
                        response
                )
        );
    }

    @PutMapping("/{id}")
    @Operation(summary = "리소스 수정")
    public ResponseEntity<BaseResponse<ResourceResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ResourceRequest request
    ) {
        ResourceResponse response = resourceService.update(id, request);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("리소스 수정 성공", response)
        );
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "리소스 삭제")
    public ResponseEntity<BaseResponse<Void>> delete(
            @PathVariable Long id
    ) {
        resourceService.delete(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("리소스 삭제 성공", null)
        );
    }
}
