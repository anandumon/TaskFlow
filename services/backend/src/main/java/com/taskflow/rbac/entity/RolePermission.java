package com.taskflow.rbac.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "role_permissions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolePermission {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "role_id", nullable = false)
    private UUID roleId;

    @Column(name = "permission_id", nullable = false)
    private UUID permissionId;
}
