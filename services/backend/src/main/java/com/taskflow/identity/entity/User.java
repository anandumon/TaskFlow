package com.taskflow.identity.entity;

import com.taskflow.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    private String bio;

    @Column(name = "job_title")
    private String jobTitle;

    @Builder.Default
    private String timezone = "UTC";

    @Builder.Default
    private String language = "en";

    @Builder.Default
    private String status = "ACTIVE";

    @Builder.Default
    private String availability = "ONLINE";

    private String department;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "working_hours", columnDefinition = "jsonb")
    private String workingHours;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "notification_preferences", columnDefinition = "jsonb")
    private String notificationPreferences;

    @Column(name = "email_verified")
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "mfa_enabled")
    @Builder.Default
    private boolean mfaEnabled = false;

    @Column(name = "mfa_secret")
    private String mfaSecret;

    @Column(name = "auth_provider")
    @Builder.Default
    private String authProvider = "LOCAL";

    @Column(name = "provider_id")
    private String providerId;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "failed_login_attempts")
    @Builder.Default
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    public String getFullName() {
        return firstName + " " + lastName;
    }

    public boolean isLocked() {
        return lockedUntil != null && lockedUntil.isAfter(Instant.now());
    }

    public void incrementFailedLogins() {
        this.failedLoginAttempts++;
        if (this.failedLoginAttempts >= 5) {
            this.lockedUntil = Instant.now().plusSeconds(900); // 15 min lockout
        }
    }

    public void resetFailedLogins() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }
}
