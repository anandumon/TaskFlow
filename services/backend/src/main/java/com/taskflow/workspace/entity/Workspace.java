package com.taskflow.workspace.entity;

import com.taskflow.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name = "workspaces")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Workspace extends BaseEntity {
    @Column(name = "organization_id", nullable = false) private UUID organizationId;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private String slug;
    private String description;
    @Builder.Default private String color = "#6366F1";
    @Builder.Default private String icon = "briefcase";
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(columnDefinition = "jsonb") @Builder.Default private String settings = "{}";
    @Column(name = "created_by") private UUID createdBy;
}
