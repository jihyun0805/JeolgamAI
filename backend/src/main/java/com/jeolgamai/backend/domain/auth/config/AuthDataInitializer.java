package com.jeolgamai.backend.domain.auth.config;

import com.jeolgamai.backend.domain.user.entity.UserAccount;
import com.jeolgamai.backend.domain.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthDataInitializer implements CommandLineRunner {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userAccountRepository.existsByLoginId("testuser")) {
            return;
        }

        userAccountRepository.save(
                new UserAccount(
                        "testuser",
                        "testuser@jeolgamai.local",
                        passwordEncoder.encode("test1234"),
                        "테스트 사용자"
                )
        );
    }
}
