package com.jeolgamai.backend.domain.auth.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.auth.dto.AuthResponse;
import com.jeolgamai.backend.domain.auth.dto.CurrentUserResponse;
import com.jeolgamai.backend.domain.auth.dto.LoginRequest;
import com.jeolgamai.backend.domain.auth.dto.SignUpRequest;
import com.jeolgamai.backend.domain.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<BaseResponse<AuthResponse>> signUp(@Valid @RequestBody SignUpRequest request) {
        AuthResponse response = authService.signUp(request);
        return ResponseEntity.status(201).body(BaseResponse.onCreate("Sign up success", response));
    }

    @PostMapping("/login")
    public ResponseEntity<BaseResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(BaseResponse.onSuccess("Login success", response));
    }

    @GetMapping("/me")
    public ResponseEntity<BaseResponse<CurrentUserResponse>> me(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(BaseResponse.onUnauthorized("Unauthorized"));
        }

        Long userId = Long.parseLong(String.valueOf(authentication.getPrincipal()));
        CurrentUserResponse response = authService.getCurrentUser(userId);
        return ResponseEntity.ok(BaseResponse.onSuccess("Current user success", response));
    }
}
