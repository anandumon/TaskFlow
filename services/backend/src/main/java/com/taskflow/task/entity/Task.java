package com.taskflow.task.entity;

import com.taskflow.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task extends BaseEntity {

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private String status = "todo";

    @Builder.Default
    @Column(nullable = false)
    private String environment = "DEV";

    @Builder.Default
    @Column(nullable = false)
    private String priority = "medium";

    @Builder.Default
    private String tag = "Frontend";

    @Column(name = "tag_color")
    private String tagColor;

    @Column(name = "assignee_id")
    private UUID assigneeId;

    @Builder.Default
    @Column(name = "assignee_name")
    private String assigneeName = "You";

    @Builder.Default
    @Column(name = "due_date")
    private String dueDate = "Tomorrow";

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String subtasks = "[]";

    @Builder.Default
    private String assignees = "You";

    @Builder.Default
    @Column(name = "reviewer_name")
    private String reviewerName = "Lead Reviewer";

    @Builder.Default
    @Column(name = "branch_name")
    private String branchName = "";

    @Builder.Default
    @Column(name = "files_changed", columnDefinition = "TEXT")
    private String filesChanged = "[]";

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String notes = "";

    @Builder.Default
    @Column(name = "history_logs", columnDefinition = "TEXT")
    private String historyLogs = "[]";
}
