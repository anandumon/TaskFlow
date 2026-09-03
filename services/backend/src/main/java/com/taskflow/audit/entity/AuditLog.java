package com.taskflow.audit.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "organization_id") private UUID organizationId;
    @Column(name = "user_id") private UUID userId;
    @Column(nullable = false) private String action;
    @Column(name = "entity_type", nullable = false) private String entityType;
    @Column(name = "entity_id") private UUID entityId;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "before_state", columnDefinition = "jsonb") private String beforeState;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "after_state", columnDefinition = "jsonb") private String afterState;
    @Column(name = "ip_address") private String ipAddress;
    @Column(name = "user_agent") private String userAgent;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(columnDefinition = "jsonb") @Builder.Default private String metadata = "{}";
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
