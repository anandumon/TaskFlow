package com.taskflow.workspace.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkspaceMemberResponse {
    private String id;
    private String userId;
    private String email;
    private String displayName;
    private String avatarUrl;
    private String role;
    private Instant joinedAt;
}
