package com.taskflow.team.entity;

import com.taskflow.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name = "teams")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Team extends BaseEntity {
    @Column(name = "workspace_id", nullable = false) private UUID workspaceId;
    @Column(nullable = false) private String name;
    private String description;
    @Builder.Default private String color = "#8B5CF6";
    @Builder.Default private String icon = "users";
    @Column(name = "created_by") private UUID createdBy;
}
