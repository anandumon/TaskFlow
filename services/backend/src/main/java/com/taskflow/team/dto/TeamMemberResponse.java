package com.taskflow.team.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TeamMemberResponse {
    private String id;
    private String userId;
    private String displayName;
    private String email;
    private String avatarUrl;
    private String role;
    private Instant joinedAt;
}
