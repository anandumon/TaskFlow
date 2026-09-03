package com.taskflow.task.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.task.dto.CreateTaskRequest;
import com.taskflow.task.dto.TaskResponse;
import com.taskflow.task.dto.UpdateTaskRequest;
import com.taskflow.task.entity.Task;
import com.taskflow.task.repository.TaskRepository;
import com.taskflow.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkspaceRepository workspaceRepository;

    private static final Set<String> VALID_ENVIRONMENTS = Set.of("DEV", "SIT", "UAT", "RELEASE", "MAIN");

    @Transactional
    public TaskResponse createTask(UUID workspaceId, CreateTaskRequest request) {
        if (!workspaceRepository.existsByIdAndDeletedFalse(workspaceId)) {
            throw AppException.notFound("Workspace not found");
        }

        String status = request.getStatus() != null ? request.getStatus().toLowerCase().trim() : "todo";
        String environment = request.getEnvironment() != null ? request.getEnvironment().toUpperCase().trim() : "DEV";

        if ("done".equalsIgnoreCase(status)) {
            environment = "MAIN";
        }

        if (!VALID_ENVIRONMENTS.contains(environment)) {
            environment = "DEV";
        }

        String branch = request.getBranchName() != null && !request.getBranchName().isBlank()
                ? request.getBranchName().trim()
                : "feature/" + request.getTitle().trim().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");

        Task task = Task.builder()
                .workspaceId(workspaceId)
                .projectId(request.getProjectId())
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : "")
                .status(status)
                .environment(environment)
                .priority(request.getPriority() != null ? request.getPriority().toLowerCase().trim() : "medium")
                .tag(request.getTag() != null ? request.getTag().trim() : "Frontend")
                .tagColor(request.getTagColor())
                .assigneeId(request.getAssigneeId())
                .assigneeName(request.getAssigneeName() != null ? request.getAssigneeName().trim() : "You")
                .assignees(request.getAssignees() != null && !request.getAssignees().isBlank() ? request.getAssignees().trim() : (request.getAssigneeName() != null ? request.getAssigneeName().trim() : "You"))
                .reviewerName(request.getReviewerName() != null && !request.getReviewerName().isBlank() ? request.getReviewerName().trim() : "Lead Reviewer")
                .dueDate(request.getDueDate() != null ? request.getDueDate().trim() : "Tomorrow")
                .subtasks(request.getSubtasks() != null && !request.getSubtasks().isBlank() ? request.getSubtasks() : "[]")
                .branchName(branch)
                .filesChanged(request.getFilesChanged() != null && !request.getFilesChanged().isBlank() ? request.getFilesChanged() : "[]")
                .notes(request.getNotes() != null ? request.getNotes().trim() : "")
                .historyLogs(request.getHistoryLogs() != null && !request.getHistoryLogs().isBlank() ? request.getHistoryLogs() : "[]")
                .build();

        task = taskRepository.save(task);
        log.info("Task created: '{}' [status: {}, env: {}] in workspace: {}", task.getTitle(), task.getStatus(), task.getEnvironment(), workspaceId);

        return toResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByWorkspace(UUID workspaceId) {
        return taskRepository.findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProject(UUID projectId) {
        return taskRepository.findByProjectIdAndDeletedFalseOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(UUID id) {
        Task task = taskRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Task not found"));
        return toResponse(task);
    }

    @Transactional
    public TaskResponse updateTask(UUID id, UpdateTaskRequest request) {
        Task task = taskRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Task not found"));

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            task.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            String newStatus = request.getStatus().toLowerCase().trim();
            task.setStatus(newStatus);
            if ("done".equals(newStatus)) {
                task.setEnvironment("MAIN");
            }
        }
        if (request.getEnvironment() != null) {
            String env = request.getEnvironment().toUpperCase().trim();
            if (VALID_ENVIRONMENTS.contains(env)) {
                task.setEnvironment(env);
                if ("MAIN".equals(env)) {
                    task.setStatus("done");
                }
            }
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority().toLowerCase().trim());
        }
        if (request.getTag() != null) {
            task.setTag(request.getTag().trim());
        }
        if (request.getTagColor() != null) {
            task.setTagColor(request.getTagColor());
        }
        if (request.getAssigneeId() != null) {
            task.setAssigneeId(request.getAssigneeId());
        }
        if (request.getAssigneeName() != null) {
            task.setAssigneeName(request.getAssigneeName().trim());
        }
        if (request.getAssignees() != null) {
            task.setAssignees(request.getAssignees().trim());
        }
        if (request.getReviewerName() != null) {
            task.setReviewerName(request.getReviewerName().trim());
        }
        if (request.getBranchName() != null) {
            task.setBranchName(request.getBranchName().trim());
        }
        if (request.getSubtasks() != null) {
            task.setSubtasks(request.getSubtasks());
        }
        if (request.getFilesChanged() != null) {
            task.setFilesChanged(request.getFilesChanged());
        }
        if (request.getNotes() != null) {
            task.setNotes(request.getNotes());
        }
        if (request.getHistoryLogs() != null) {
            task.setHistoryLogs(request.getHistoryLogs());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate().trim());
        }
        if (request.getProjectId() != null) {
            task.setProjectId(request.getProjectId());
        }

        task = taskRepository.save(task);
        log.info("Task updated: '{}' [status: {}, env: {}]", task.getTitle(), task.getStatus(), task.getEnvironment());
        return toResponse(task);
    }

    @Transactional
    public void deleteTask(UUID id) {
        Task task = taskRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Task not found"));
        task.setDeleted(true);
        taskRepository.save(task);
        log.info("Task soft-deleted: {}", id);
    }

    private TaskResponse toResponse(Task t) {
        return TaskResponse.builder()
                .id(t.getId())
                .workspaceId(t.getWorkspaceId())
                .projectId(t.getProjectId())
                .title(t.getTitle())
                .description(t.getDescription())
                .status(t.getStatus())
                .environment(t.getEnvironment())
                .priority(t.getPriority())
                .tag(t.getTag())
                .tagColor(t.getTagColor())
                .assigneeId(t.getAssigneeId())
                .assigneeName(t.getAssigneeName())
                .assignees(t.getAssignees() != null ? t.getAssignees() : "You")
                .reviewerName(t.getReviewerName() != null ? t.getReviewerName() : "Lead Reviewer")
                .dueDate(t.getDueDate())
                .subtasks(t.getSubtasks() != null ? t.getSubtasks() : "[]")
                .branchName(t.getBranchName() != null ? t.getBranchName() : "")
                .filesChanged(t.getFilesChanged() != null ? t.getFilesChanged() : "[]")
                .notes(t.getNotes() != null ? t.getNotes() : "")
                .historyLogs(t.getHistoryLogs() != null ? t.getHistoryLogs() : "[]")
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
