package com.taskflow.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private UUID id;
    private UUID workspaceId;
    private UUID projectId;
    private String title;
    private String description;
    private String status;
    private String environment;
    private String priority;
    private String tag;
    private String tagColor;
    private UUID assigneeId;
    private String assigneeName;
    private String dueDate;
    private String subtasks;
    private String assignees;
    private String reviewerName;
    private String branchName;
    private String filesChanged;
    private String notes;
    private String historyLogs;
    private Integer position;
    private Integer progress;
    private Instant createdAt;
    private Instant updatedAt;
}
