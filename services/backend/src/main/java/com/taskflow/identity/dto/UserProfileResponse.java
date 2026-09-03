package com.taskflow.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private String jobTitle;
    private String timezone;
    private String language;
    private String status;
    private String availability;
    private String department;
    private boolean emailVerified;
    private boolean mfaEnabled;
    private Instant lastLoginAt;
    private Instant createdAt;
}
