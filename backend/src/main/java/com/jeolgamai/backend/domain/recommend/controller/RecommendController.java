package com.jeolgamai.backend.domain.recommend.controller;

import com.jeolgamai.backend.domain.recommend.dto.RecommendRequest;
import com.jeolgamai.backend.domain.recommend.dto.RecommendResponse;
import com.jeolgamai.backend.domain.recommend.service.RecommendService;
import com.jeolgamai.backend.common.dto.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommend", description = "추천 관리 API")
public class RecommendController {

    private final RecommendService recommendService;

    @PostMapping
    @Operation(summary = "추천 생성")
    public ResponseEntity<BaseResponse<RecommendResponse>> create(
            @Valid @RequestBody RecommendRequest request
    ) {
        RecommendResponse response = recommendService.create(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.onSuccess("추천 생성 성공", response));
    }

    @GetMapping
    @Operation(summary = "추천 전체 조회")
    public ResponseEntity<BaseResponse<List<RecommendResponse>>> findAll() {
        List<RecommendResponse> response = recommendService.findAll();
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "추후 수정될 메시지입니다.",
                        response
                )
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "추천 단건 조회")
    public ResponseEntity<BaseResponse<RecommendResponse>> findById(
            @PathVariable Long id
    ) {
        RecommendResponse response = recommendService.findById(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "추후 수정될 메시지입니다.",
                        response
                )
        );
    }

    @PutMapping("/{id}")
    @Operation(summary = "추천 수정")
    public ResponseEntity<BaseResponse<RecommendResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody RecommendRequest request
    ) {
        RecommendResponse response = recommendService.update(id, request);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("추천 수정 성공", response)
        );
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "추천 삭제")
    public ResponseEntity<BaseResponse<Void>> delete(
            @PathVariable Long id
    ) {
        recommendService.delete(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("추천 삭제 성공", null)
        );
    }
}
