package com.taskflow.organization.entity;

import com.taskflow.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Organization extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "logo_url")
    private String logoUrl;

    private String domain;

    @Builder.Default
    private String plan = "FREE";

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String settings = "{}";

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;
}
