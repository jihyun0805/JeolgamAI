package com.jeolgamai.backend.domain.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CurrentUserResponse {

    private Long userId;
    private String loginId;
    private String email;
    private String name;
}
