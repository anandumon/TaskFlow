package com.taskflow.identity.entity;

import com.taskflow.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "email_verification_otp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerificationOtp extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "otp_hash", nullable = false)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "max_attempts", nullable = false)
    @Builder.Default
    private int maxAttempts = 5;

    @Column(name = "resend_count", nullable = false)
    @Builder.Default
    private int resendCount = 0;

    @Column(name = "last_sent_at", nullable = false)
    @Builder.Default
    private Instant lastSentAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private OtpStatus status = OtpStatus.ACTIVE;

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isMaxAttemptsReached() {
        return attemptCount >= maxAttempts;
    }

    public int getRemainingAttempts() {
        return Math.max(0, maxAttempts - attemptCount);
    }

    public void incrementAttempt() {
        this.attemptCount++;
        if (this.attemptCount >= this.maxAttempts) {
            this.status = OtpStatus.MAX_ATTEMPTS_EXCEEDED;
        }
    }

    public void markVerified() {
        this.status = OtpStatus.VERIFIED;
        this.verifiedAt = Instant.now();
    }

    public void markReplaced() {
        this.status = OtpStatus.REPLACED;
    }

    public void markExpired() {
        this.status = OtpStatus.EXPIRED;
    }
}
