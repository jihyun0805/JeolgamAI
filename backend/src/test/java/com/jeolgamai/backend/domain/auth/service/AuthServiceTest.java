package com.jeolgamai.backend.domain.auth.service;

import com.jeolgamai.backend.domain.auth.dto.AuthResponse;
import com.jeolgamai.backend.domain.auth.dto.LoginRequest;
import com.jeolgamai.backend.domain.auth.dto.SignUpRequest;
import com.jeolgamai.backend.domain.user.entity.UserAccount;
import com.jeolgamai.backend.domain.user.repository.UserAccountRepository;
import com.jeolgamai.backend.global.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userAccountRepository, passwordEncoder, jwtTokenProvider);
    }

    @Test
    void signUpCreatesUserAndReturnsToken() {
        SignUpRequest request = new SignUpRequest("USER@EXAMPLE.COM", "password123", "Alice");
        UserAccount saved = new UserAccount("user@example.com", "encoded", "Alice");
        saved.setId(1L);

        when(userAccountRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userAccountRepository.save(any(UserAccount.class))).thenReturn(saved);
        when(jwtTokenProvider.generateToken(1L, "user@example.com")).thenReturn("token");

        AuthResponse response = authService.signUp(request);

        assertEquals(1L, response.getUserId());
        assertEquals("user@example.com", response.getEmail());
        assertEquals("Alice", response.getName());
        assertEquals("token", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        verify(userAccountRepository).existsByEmail("user@example.com");
        verify(passwordEncoder).encode("password123");
    }

    @Test
    void signUpThrowsWhenEmailExists() {
        when(userAccountRepository.existsByEmail("user@example.com")).thenReturn(true);

        try {
            authService.signUp(new SignUpRequest("user@example.com", "password123", "Alice"));
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
            assertEquals("Email already exists", e.getReason());
        }
    }

    @Test
    void loginReturnsTokenWhenCredentialsValid() {
        UserAccount user = new UserAccount("user@example.com", "encoded", "Alice");
        user.setId(7L);

        when(userAccountRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(eq("password123"), eq("encoded"))).thenReturn(true);
        when(jwtTokenProvider.generateToken(7L, "user@example.com")).thenReturn("token-7");

        AuthResponse response = authService.login(new LoginRequest("user@example.com", "password123"));

        assertEquals(7L, response.getUserId());
        assertEquals("token-7", response.getAccessToken());
    }

    @Test
    void loginThrowsWhenPasswordMismatch() {
        UserAccount user = new UserAccount("user@example.com", "encoded", "Alice");
        when(userAccountRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(eq("wrong"), eq("encoded"))).thenReturn(false);

        try {
            authService.login(new LoginRequest("user@example.com", "wrong"));
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.UNAUTHORIZED, e.getStatusCode());
            assertTrue(e.getReason().contains("Invalid email or password"));
        }
    }
}
