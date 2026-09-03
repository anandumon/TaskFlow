package com.taskflow.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocialLoginRequest {

    @NotBlank(message = "Provider is required (google, github, microsoft)")
    private String provider;

    private String email;

    private String name;

    private String providerId;

    private String code;

    private String idToken;

    private String redirectUri;

    private String avatarUrl;

    private String mode; // "signin" or "signup"
}
