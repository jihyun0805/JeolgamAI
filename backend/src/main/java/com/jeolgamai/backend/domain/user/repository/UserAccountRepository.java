package com.jeolgamai.backend.domain.user.repository;

import com.jeolgamai.backend.domain.user.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByLoginId(String loginId);

    Optional<UserAccount> findById(Long id);

    boolean existsByEmail(String email);

    boolean existsByLoginId(String loginId);
}
