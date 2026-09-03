package com.taskflow.project.entity;

import com.taskflow.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends BaseEntity {

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private String status = "ACTIVE";

    @Builder.Default
    @Column(nullable = false)
    private Integer progress = 0;

    @Builder.Default
    private String color = "#6366F1";

    @Builder.Default
    private String icon = "folder";

    @Builder.Default
    @Column(nullable = false)
    private String environments = "DEV,SIT,UAT,RELEASE,MAIN";
}
