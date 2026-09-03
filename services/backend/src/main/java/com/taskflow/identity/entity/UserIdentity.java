package com.taskflow.identity.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_identity", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_identity_provider_uid", columnNames = {"provider", "provider_user_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserIdentity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "provider", nullable = false, length = 50)
    private String provider; // 'google', 'microsoft', 'local'

    @Column(name = "provider_user_id", nullable = false)
    private String providerUserId;

    @Column(name = "provider_email")
    private String providerEmail;

    @Column(name = "provider_email_verified")
    private Boolean providerEmailVerified;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
