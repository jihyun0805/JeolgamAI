package com.jeolgamai.backend.domain.integration.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.integration.dto.ConnectorStatusResponse;
import com.jeolgamai.backend.domain.integration.service.ConnectorRegistryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations/connectors")
@RequiredArgsConstructor
@Tag(name = "Connector Status", description = "backend connector 등록 상태 조회 API")
public class ConnectorStatusController {

    private final ConnectorRegistryService connectorRegistryService;

    @GetMapping("/status")
    @Operation(summary = "workspace별 backend connector 등록 상태 조회")
    public ResponseEntity<BaseResponse<ConnectorStatusResponse>> getStatus(@RequestParam String workspaceId) {
        try {
            return ResponseEntity.ok(
                    BaseResponse.onSuccess(
                            "connector 상태 조회 성공",
                            new ConnectorStatusResponse(
                                    workspaceId,
                                    connectorRegistryService.hasAwsConnector(workspaceId),
                                    connectorRegistryService.hasK8sConnector(workspaceId),
                                    connectorRegistryService.hasPrometheusConnector(workspaceId)
                            )
                    )
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(BaseResponse.onBadRequest(exception.getMessage()));
        }
    }
}
