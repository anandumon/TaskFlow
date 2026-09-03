package com.taskflow.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private boolean requiresVerification;
    private String verificationMessage;
    private String devCode;
    private UserResponse user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserResponse {
        private String id;
        private String email;
        private String firstName;
        private String lastName;
        private String displayName;
        private String avatarUrl;
        private boolean emailVerified;
    }
}
