package com.taskflow.team.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "team_members")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamMember {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "team_id", nullable = false) private UUID teamId;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Builder.Default private String role = "MEMBER";
    @Column(name = "joined_at") @Builder.Default private Instant joinedAt = Instant.now();
    @Column(name = "created_at", updatable = false) private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); updatedAt = Instant.now(); }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
