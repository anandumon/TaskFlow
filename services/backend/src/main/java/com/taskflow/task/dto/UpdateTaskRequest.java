package com.taskflow.task.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateTaskRequest {
    private UUID projectId;

    @Size(max = 500)
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
}
