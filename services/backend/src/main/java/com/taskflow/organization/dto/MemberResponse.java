package com.taskflow.organization.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MemberResponse {
    private String id;
    private String userId;
    private String email;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private String role;
    private String roleId;
    private Instant joinedAt;
}
