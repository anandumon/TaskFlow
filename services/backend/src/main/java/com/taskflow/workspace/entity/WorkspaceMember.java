package com.taskflow.workspace.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "workspace_members")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkspaceMember {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "workspace_id", nullable = false) private UUID workspaceId;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "role_id") private UUID roleId;
    @Column(name = "joined_at") @Builder.Default private Instant joinedAt = Instant.now();
    @Column(name = "created_at", updatable = false) private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); updatedAt = Instant.now(); }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
