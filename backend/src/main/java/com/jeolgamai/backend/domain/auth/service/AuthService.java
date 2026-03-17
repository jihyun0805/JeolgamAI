package com.jeolgamai.backend.domain.auth.service;

import com.jeolgamai.backend.domain.auth.dto.AuthResponse;
import com.jeolgamai.backend.domain.auth.dto.LoginRequest;
import com.jeolgamai.backend.domain.auth.dto.SignUpRequest;
import com.jeolgamai.backend.domain.user.entity.UserAccount;
import com.jeolgamai.backend.domain.user.repository.UserAccountRepository;
import com.jeolgamai.backend.global.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponse signUp(SignUpRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userAccountRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        UserAccount saved = userAccountRepository.save(
                new UserAccount(
                        normalizedEmail,
                        passwordEncoder.encode(request.getPassword()),
                        request.getName().trim()
                )
        );

        String token = jwtTokenProvider.generateToken(saved.getId(), saved.getEmail());
        return new AuthResponse(saved.getId(), saved.getEmail(), saved.getName(), token, "Bearer");
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        UserAccount user = userAccountRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(user.getId(), user.getEmail(), user.getName(), token, "Bearer");
    }
}
