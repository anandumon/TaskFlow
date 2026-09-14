package com.taskflow.calendar.dto;

import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OAuthTokenResponse {
    private String accessToken;
    private String refreshToken;
    private Instant tokenExpiresAt;
    private String scope;
    private String providerAccountId;
    private String providerEmail;
}
