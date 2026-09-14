package com.taskflow.calendar.entity;

import com.taskflow.identity.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "calendar_connection", uniqueConstraints = {
    @UniqueConstraint(name = "uq_calendar_connection_user_provider", columnNames = {"user_id", "provider"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "provider", nullable = false, length = 50)
    private String provider; // 'google', 'microsoft'

    @Column(name = "provider_account_id")
    private String providerAccountId;

    @Column(name = "provider_email")
    private String providerEmail;

    @Column(name = "access_token")
    private byte[] accessToken;

    @Column(name = "refresh_token")
    private byte[] refreshToken;

    @Column(name = "token_expires_at")
    private Instant tokenExpiresAt;

    @Column(name = "scope", columnDefinition = "TEXT")
    private String scope;

    @Column(name = "status", length = 50)
    private String status; // 'ACTIVE', 'SYNCED', 'EXPIRED', 'REVOKED'

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "last_successful_sync_at")
    private Instant lastSuccessfulSyncAt;

    @Column(name = "last_sync_started_at")
    private Instant lastSyncStartedAt;

    @Column(name = "last_sync_error", columnDefinition = "TEXT")
    private String lastSyncError;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
