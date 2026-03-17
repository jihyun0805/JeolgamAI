package com.jeolgamai.backend.domain.auth.service;

import com.jeolgamai.backend.domain.auth.dto.AuthResponse;
import com.jeolgamai.backend.domain.auth.dto.CurrentUserResponse;
import com.jeolgamai.backend.domain.auth.dto.LoginRequest;
import com.jeolgamai.backend.domain.auth.dto.SignUpRequest;
import com.jeolgamai.backend.domain.user.entity.UserAccount;
import com.jeolgamai.backend.domain.user.repository.UserAccountRepository;
import com.jeolgamai.backend.global.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponse signUp(SignUpRequest request) {
        String normalizedLoginId = normalizeLoginId(request.getLoginId());
        String normalizedEmail = resolveEmail(request.getEmail(), normalizedLoginId);
        if (userAccountRepository.existsByLoginId(normalizedLoginId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Login ID already exists");
        }
        if (userAccountRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        UserAccount saved = userAccountRepository.save(
                new UserAccount(
                        normalizedLoginId,
                        normalizedEmail,
                        passwordEncoder.encode(request.getPassword()),
                        request.getName().trim()
                )
        );

        String token = jwtTokenProvider.generateToken(saved.getId(), saved.getEmail(), saved.getLoginId());
        return new AuthResponse(saved.getId(), saved.getLoginId(), saved.getEmail(), saved.getName(), token, "Bearer");
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = normalizeLoginId(request.getLoginId());
        UserAccount user = findByLoginIdentifier(identifier)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid login ID or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid login ID or password");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getLoginId());
        return new AuthResponse(user.getId(), user.getLoginId(), user.getEmail(), user.getName(), token, "Bearer");
    }

    public CurrentUserResponse getCurrentUser(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return new CurrentUserResponse(user.getId(), user.getLoginId(), user.getEmail(), user.getName());
    }

    private Optional<UserAccount> findByLoginIdentifier(String identifier) {
        if (identifier.contains("@")) {
            Optional<UserAccount> byEmail = userAccountRepository.findByEmail(identifier);
            if (byEmail.isPresent()) {
                return byEmail;
            }
        }
        return userAccountRepository.findByLoginId(identifier);
    }

    private String normalizeLoginId(String loginId) {
        if (!StringUtils.hasText(loginId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Login ID is required");
        }
        return loginId.trim().toLowerCase();
    }

    private String resolveEmail(String email, String loginId) {
        if (StringUtils.hasText(email)) {
            return email.trim().toLowerCase();
        }
        return loginId + "@jeolgamai.local";
    }
}
