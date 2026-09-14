package com.taskflow.task.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.identity.email.EmailService;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.project.entity.Project;
import com.taskflow.project.repository.ProjectRepository;
import com.taskflow.task.dto.CreateTaskRequest;
import com.taskflow.task.dto.TaskResponse;
import com.taskflow.task.dto.UpdateTaskRequest;
import com.taskflow.task.entity.Task;
import com.taskflow.task.repository.TaskRepository;
import com.taskflow.workspace.entity.Workspace;
import com.taskflow.workspace.repository.WorkspaceMemberRepository;
import com.taskflow.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final EmailService emailService;
    private final com.taskflow.calendar.service.CalendarSyncService calendarSyncService;
    private final com.taskflow.organization.repository.OrganizationRepository organizationRepository;
    private final com.taskflow.organization.repository.OrganizationMemberRepository orgMemberRepository;
    private final com.taskflow.project.repository.ProjectInvitationRepository projectInvitationRepository;
    private final com.taskflow.rbac.service.AuthorizationService authorizationService;

    @Value("${taskflow.app.url:http://localhost:3000}")
    private String appUrl;

    private static final Set<String> VALID_ENVIRONMENTS = Set.of("DEV", "SIT", "UAT", "RELEASE", "MAIN");

    private void assertTaskEditPermission(Task task) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            return;
        }
        authorizationService.requireTaskPermission(principal.getId(), task.getId(), com.taskflow.rbac.domain.PermissionCode.TASK_UPDATE);
    }

    private void assertTaskDeletePermission(Task task) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            return;
        }
        authorizationService.requireTaskPermission(principal.getId(), task.getId(), com.taskflow.rbac.domain.PermissionCode.TASK_DELETE);
    }

    @Transactional
    public TaskResponse createTask(UUID workspaceId, CreateTaskRequest request) {
        if (!workspaceRepository.existsByIdAndDeletedFalse(workspaceId)) {
            throw AppException.notFound("Workspace not found");
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal principal = (auth != null && auth.getPrincipal() instanceof UserPrincipal up) ? up : null;

        if (principal != null) {
            if (request.getProjectId() != null) {
                authorizationService.requireProjectPermission(principal.getId(), request.getProjectId(), com.taskflow.rbac.domain.PermissionCode.TASK_CREATE);
            } else {
                authorizationService.requireWorkspacePermission(principal.getId(), workspaceId, com.taskflow.rbac.domain.PermissionCode.TASK_CREATE);
            }
        }

        UUID creatorId = principal != null ? principal.getId() : null;
        UUID assigneeId = request.getAssigneeId() != null ? request.getAssigneeId() : creatorId;
        String defaultAssigneeName = principal != null
                ? ((principal.getFirstName() != null ? principal.getFirstName() : "") + " " + (principal.getLastName() != null ? principal.getLastName() : "")).trim()
                : "You";
        String assigneeName = request.getAssigneeName() != null ? request.getAssigneeName().trim() : defaultAssigneeName;

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
                .assigneeId(assigneeId)
                .assigneeName(assigneeName)
                .assignees(request.getAssignees() != null && !request.getAssignees().isBlank() ? request.getAssignees().trim() : assigneeName)
                .reviewerName(request.getReviewerName() != null && !request.getReviewerName().isBlank() ? request.getReviewerName().trim() : "Lead Reviewer")
                .dueDate(request.getDueDate() != null ? request.getDueDate().trim() : "Tomorrow")
                .subtasks(request.getSubtasks() != null && !request.getSubtasks().isBlank() ? request.getSubtasks() : "[]")
                .branchName(branch)
                .filesChanged(request.getFilesChanged() != null && !request.getFilesChanged().isBlank() ? request.getFilesChanged() : "[]")
                .notes(request.getNotes() != null ? request.getNotes().trim() : "")
                .historyLogs(request.getHistoryLogs() != null && !request.getHistoryLogs().isBlank() ? request.getHistoryLogs() : "[]")
                .position(0)
                .progress(request.getProgress() != null ? request.getProgress() : 0)
                .createdBy(creatorId)
                .build();

        task = taskRepository.save(task);
        log.info("Task created: '{}' [status: {}, env: {}] in workspace: {}", task.getTitle(), task.getStatus(), task.getEnvironment(), workspaceId);

        try {
            calendarSyncService.syncTaskToCalendar(task, "CREATE");
        } catch (Exception e) {
            log.warn("Calendar sync failed for created task {}: {}", task.getId(), e.getMessage());
        }

        return toResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByWorkspace(UUID workspaceId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal principal = (auth != null && auth.getPrincipal() instanceof UserPrincipal up) ? up : null;

        return taskRepository.findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(workspaceId)
                .stream()
                .filter(t -> principal == null || authorizationService.hasTaskPermission(principal.getId(), t.getId(), com.taskflow.rbac.domain.PermissionCode.TASK_VIEW))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProject(UUID projectId) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> AppException.notFound("Project not found"));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            authorizationService.requireProjectPermission(principal.getId(), projectId, com.taskflow.rbac.domain.PermissionCode.TASK_VIEW);
        }

        return taskRepository.findByProjectIdAndDeletedFalseOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(UUID id) {
        Task task = taskRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Task not found"));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            authorizationService.requireTaskPermission(principal.getId(), task.getId(), com.taskflow.rbac.domain.PermissionCode.TASK_VIEW);
        }

        return toResponse(task);
    }

    @Transactional
    public TaskResponse updateTask(UUID id, UpdateTaskRequest request) {
        Task task = taskRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Task not found"));

        assertTaskEditPermission(task);

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
        if (request.getPosition() != null) {
            task.setPosition(request.getPosition());
        }
        if (request.getProgress() != null) {
            task.setProgress(request.getProgress());
        }

        task = taskRepository.save(task);
        log.info("Task updated: '{}' [status: {}, env: {}]", task.getTitle(), task.getStatus(), task.getEnvironment());

        try {
            calendarSyncService.syncTaskToCalendar(task, "UPDATE");
        } catch (Exception e) {
            log.warn("Calendar sync failed for updated task {}: {}", task.getId(), e.getMessage());
        }

        return toResponse(task);
    }

    @Transactional
    public void deleteTask(UUID id) {
        Task task = taskRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Task not found"));

        assertTaskDeletePermission(task);

        task.setDeleted(true);
        taskRepository.save(task);
        log.info("Task soft-deleted: {}", id);

        try {
            calendarSyncService.syncTaskToCalendar(task, "DELETE");
        } catch (Exception e) {
            log.warn("Calendar sync failed for deleted task {}: {}", id, e.getMessage());
        }
    }

    /**
     * Dispatch due alert email for a specific task (manual click or single dispatch).
     */
    @Transactional
    public Map<String, Object> dispatchDueAlert(UUID taskId) {
        Task task = taskRepository.findByIdAndDeletedFalse(taskId)
                .orElseThrow(() -> AppException.notFound("Task not found"));

        DueDateInfo dueInfo = parseDueDate(task.getDueDate());

        // Resolve Project & Workspace
        String projectName = "Project";
        if (task.getProjectId() != null) {
            projectName = projectRepository.findByIdAndDeletedFalse(task.getProjectId())
                    .map(Project::getName)
                    .orElse("Project");
        }

        String workspaceName = "Workspace";
        Workspace workspace = null;
        if (task.getWorkspaceId() != null) {
            workspace = workspaceRepository.findById(task.getWorkspaceId()).orElse(null);
            if (workspace != null) {
                workspaceName = workspace.getName();
            }
        }

        // Resolve Recipient Email and Name
        String recipientEmail = null;
        String recipientName = task.getAssigneeName() != null ? task.getAssigneeName() : "Team Member";

        // 1. Check if assignee_id is set and points to a user
        if (task.getAssigneeId() != null) {
            Optional<User> userOpt = userRepository.findByIdAndDeletedFalse(task.getAssigneeId());
            if (userOpt.isPresent()) {
                recipientEmail = userOpt.get().getEmail();
                recipientName = userOpt.get().getFullName();
            }
        }

        // 2. Fallback to currently authenticated user if assignee email not found
        if (recipientEmail == null || recipientEmail.isBlank()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                recipientEmail = up.getEmail();
                recipientName = up.getFirstName() + " " + up.getLastName();
            }
        }

        // 3. Fallback to workspace creator
        if ((recipientEmail == null || recipientEmail.isBlank()) && workspace != null && workspace.getCreatedBy() != null) {
            Optional<User> creator = userRepository.findByIdAndDeletedFalse(workspace.getCreatedBy());
            if (creator.isPresent()) {
                recipientEmail = creator.get().getEmail();
                recipientName = creator.get().getFullName();
            }
        }

        // 4. Default fallback
        if (recipientEmail == null || recipientEmail.isBlank()) {
            recipientEmail = "team@taskflow.dev";
        }

        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";
        String taskUrl = baseUrl + "/app/tasks/" + task.getId();

        emailService.sendTaskDueAlertEmail(
                recipientEmail,
                recipientName,
                task.getTitle(),
                projectName,
                workspaceName,
                task.getDueDate(),
                dueInfo.timeRemainingText(),
                dueInfo.bannerText(),
                dueInfo.badgeClass(),
                task.getStatus().toUpperCase(),
                task.getPriority().toUpperCase(),
                taskUrl
        );

        task.setLastDueAlertAt(Instant.now());
        taskRepository.save(task);

        log.info("🔔 Dispatched due alert for task '{}' (due: {}) to {}", task.getTitle(), task.getDueDate(), recipientEmail);

        return Map.of(
                "success", true,
                "taskId", task.getId(),
                "recipientEmail", recipientEmail,
                "recipientName", recipientName,
                "dueDate", task.getDueDate(),
                "status", dueInfo.bannerText()
        );
    }

    /**
     * Dispatch due alert email digest to user for all tasks matching a specific selected date in workspace.
     */
    @Transactional
    public Map<String, Object> dispatchDateDueAlerts(UUID workspaceId, String selectedDate, String overrideEmail) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> AppException.notFound("Workspace not found"));

        List<Task> allWorkspaceTasks = taskRepository.findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(workspaceId);

        String targetDate = (selectedDate != null && !selectedDate.isBlank())
                ? selectedDate.trim()
                : LocalDate.now().toString();

        // Match tasks by dueDate
        List<Task> matchingTasks = allWorkspaceTasks.stream()
                .filter(t -> !"done".equalsIgnoreCase(t.getStatus()))
                .filter(t -> {
                    if (t.getDueDate() == null || t.getDueDate().isBlank()) return false;
                    String d = t.getDueDate().trim();
                    if (d.equalsIgnoreCase(targetDate)) return true;
                    if ("Today".equalsIgnoreCase(d) && targetDate.equals(LocalDate.now().toString())) return true;
                    if ("Tomorrow".equalsIgnoreCase(d) && targetDate.equals(LocalDate.now().plusDays(1).toString())) return true;
                    return false;
                })
                .toList();

        // Resolve Recipient Email and Name
        String recipientEmail = overrideEmail;
        String recipientName = "Team Member";

        if (recipientEmail == null || recipientEmail.isBlank()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                recipientEmail = up.getEmail();
                recipientName = up.getFirstName() + " " + up.getLastName();
            }
        }

        if ((recipientEmail == null || recipientEmail.isBlank()) && workspace.getCreatedBy() != null) {
            Optional<User> creator = userRepository.findByIdAndDeletedFalse(workspace.getCreatedBy());
            if (creator.isPresent()) {
                recipientEmail = creator.get().getEmail();
                recipientName = creator.get().getFullName();
            }
        }

        if (recipientEmail == null || recipientEmail.isBlank()) {
            recipientEmail = "team@taskflow.dev";
        }

        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";
        String workspaceUrl = baseUrl + "/app/tasks";

        if (matchingTasks.isEmpty()) {
            return Map.of(
                    "success", true,
                    "taskCount", 0,
                    "recipientEmail", recipientEmail,
                    "selectedDate", targetDate,
                    "message", "No tasks found due on " + targetDate
            );
        }

        // Build HTML for task list
        StringBuilder sb = new StringBuilder();
        for (Task t : matchingTasks) {
            String projName = "General";
            if (t.getProjectId() != null) {
                projName = projectRepository.findByIdAndDeletedFalse(t.getProjectId())
                        .map(Project::getName)
                        .orElse("General");
            }

            sb.append("<div class=\"task-card\">")
              .append("<h3 class=\"task-title\">").append(escapeHtml(t.getTitle())).append("</h3>")
              .append("<div class=\"task-meta\">")
              .append("<span>📁 <strong>").append(escapeHtml(projName)).append("</strong></span>")
              .append("<span class=\"tag-badge\">").append(escapeHtml(t.getTag())).append("</span>")
              .append("<span class=\"priority-badge\">").append(escapeHtml(t.getPriority().toUpperCase())).append("</span>")
              .append("<span>👤 ").append(escapeHtml(t.getAssigneeName() != null ? t.getAssigneeName() : "You")).append("</span>")
              .append("<span>⚙️ ").append(escapeHtml(t.getStatus().toUpperCase())).append("</span>")
              .append("</div>")
              .append("</div>");

            t.setLastDueAlertAt(Instant.now());
            taskRepository.save(t);
        }

        emailService.sendDateDueAlertDigestEmail(
                recipientEmail,
                recipientName,
                targetDate,
                matchingTasks.size(),
                sb.toString(),
                workspaceUrl
        );

        log.info("🔔 Sent Date Due Alert Digest (date: {}, tasks: {}) to {}", targetDate, matchingTasks.size(), recipientEmail);

        return Map.of(
                "success", true,
                "taskCount", matchingTasks.size(),
                "recipientEmail", recipientEmail,
                "selectedDate", targetDate,
                "message", "Sent due alert for " + matchingTasks.size() + " task(s) to " + recipientEmail
        );
    }

    /**
     * Dispatch alert email for upcoming uncompleted tasks and their pending subtasks in workspace.
     */
    @Transactional
    public Map<String, Object> dispatchUpcomingDueAlerts(UUID workspaceId, String overrideEmail) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> AppException.notFound("Workspace not found"));

        List<Task> allTasks = taskRepository.findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(workspaceId);

        // Filter uncompleted tasks with due date
        List<Task> upcomingTasks = allTasks.stream()
                .filter(t -> !"done".equalsIgnoreCase(t.getStatus()))
                .filter(t -> t.getDueDate() != null && !t.getDueDate().isBlank())
                .toList();

        // Resolve Recipient
        String recipientEmail = overrideEmail;
        String recipientName = "Team Member";

        if (recipientEmail == null || recipientEmail.isBlank()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                recipientEmail = up.getEmail();
                recipientName = up.getFirstName() + " " + up.getLastName();
            }
        }

        if ((recipientEmail == null || recipientEmail.isBlank()) && workspace.getCreatedBy() != null) {
            Optional<User> creator = userRepository.findByIdAndDeletedFalse(workspace.getCreatedBy());
            if (creator.isPresent()) {
                recipientEmail = creator.get().getEmail();
                recipientName = creator.get().getFullName();
            }
        }

        if (recipientEmail == null || recipientEmail.isBlank()) {
            recipientEmail = "team@taskflow.dev";
        }

        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";
        String workspaceUrl = baseUrl + "/app/calendar";

        if (upcomingTasks.isEmpty()) {
            return Map.of(
                    "success", true,
                    "taskCount", 0,
                    "recipientEmail", recipientEmail,
                    "message", "No upcoming uncompleted tasks found in this workspace."
            );
        }

        // Build HTML with tasks and uncompleted subtasks
        StringBuilder sb = new StringBuilder();
        int totalPendingSubtasks = 0;

        for (Task t : upcomingTasks) {
            String projName = "General";
            if (t.getProjectId() != null) {
                projName = projectRepository.findByIdAndDeletedFalse(t.getProjectId())
                        .map(Project::getName)
                        .orElse("General");
            }

            List<String> pendingSubtasks = extractPendingSubtasks(t.getSubtasks());
            totalPendingSubtasks += pendingSubtasks.size();

            sb.append("<div class=\"task-card\" style=\"margin-bottom: 16px; padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);\">")
              .append("<div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;\">")
              .append("<span style=\"font-size: 11px; font-weight: 700; color: #6366f1;\">📁 ").append(escapeHtml(projName)).append("</span>")
              .append("<span style=\"font-size: 11px; font-weight: 700; color: #f43f5e;\">📅 Due: ").append(escapeHtml(t.getDueDate())).append("</span>")
              .append("</div>")
              .append("<h3 class=\"task-title\" style=\"margin: 0 0 8px 0; font-size: 14px; font-weight: 700;\">").append(escapeHtml(t.getTitle())).append("</h3>")
              .append("<div class=\"task-meta\" style=\"font-size: 11px; color: #94a3b8; display: flex; gap: 10px; margin-bottom: 8px;\">")
              .append("<span class=\"priority-badge\">Priority: ").append(escapeHtml(t.getPriority().toUpperCase())).append("</span>")
              .append("<span>Status: ").append(escapeHtml(t.getStatus().toUpperCase())).append("</span>")
              .append("<span>Assignee: ").append(escapeHtml(t.getAssigneeName() != null ? t.getAssigneeName() : "You")).append("</span>")
              .append("</div>");

            if (!pendingSubtasks.isEmpty()) {
                sb.append("<div style=\"margin-top: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(99,102,241,0.08); border-left: 3px solid #6366f1;\">")
                  .append("<div style=\"font-size: 10px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; margin-bottom: 4px;\">Pending Subtasks (").append(pendingSubtasks.size()).append(")</div>")
                  .append("<ul style=\"margin: 0; padding-left: 16px; font-size: 11px; color: #cbd5e1;\">");
                for (String st : pendingSubtasks) {
                    sb.append("<li style=\"margin-bottom: 2px;\">").append(escapeHtml(st)).append("</li>");
                }
                sb.append("</ul></div>");
            }

            sb.append("</div>");

            t.setLastDueAlertAt(Instant.now());
            taskRepository.save(t);
        }

        emailService.sendDateDueAlertDigestEmail(
                recipientEmail,
                recipientName,
                "Upcoming Sprint Milestones",
                upcomingTasks.size(),
                sb.toString(),
                workspaceUrl
        );

        log.info("🔔 Sent Upcoming Due Alerts Digest (tasks: {}, pending subtasks: {}) to {}",
                upcomingTasks.size(), totalPendingSubtasks, recipientEmail);

        return Map.of(
                "success", true,
                "taskCount", upcomingTasks.size(),
                "pendingSubtasksCount", totalPendingSubtasks,
                "recipientEmail", recipientEmail,
                "message", "Sent upcoming due alert for " + upcomingTasks.size() + " task(s) and " + totalPendingSubtasks + " subtask(s) to " + recipientEmail
        );
    }

    private List<String> extractPendingSubtasks(String subtasksJson) {
        List<String> result = new ArrayList<>();
        if (subtasksJson == null || subtasksJson.isBlank() || subtasksJson.equals("[]")) return result;
        try {
            com.fasterxml.jackson.databind.JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(subtasksJson);
            if (root.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode node : root) {
                    boolean completed = node.has("completed") && node.get("completed").asBoolean();
                    if (!completed && node.has("title")) {
                        result.add(node.get("title").asText());
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Subtask parse error: {}", e.getMessage());
        }
        return result;
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    /**
     * Automatic morning job (Runs daily at 09:00 AM) to notify assignees of tasks due today or within 3 days.
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void dispatchScheduledDueAlerts() {
        log.info("⏰ [SCHEDULED] Running daily Task Due Date Alert checker...");
        List<Task> activeTasks = taskRepository.findActiveTasksWithDueDate();
        int sentCount = 0;

        for (Task task : activeTasks) {
            try {
                DueDateInfo dueInfo = parseDueDate(task.getDueDate());
                if (dueInfo.isDueNearOrToday()) {
                    if (task.getLastDueAlertAt() == null ||
                            task.getLastDueAlertAt().isBefore(Instant.now().minus(20, ChronoUnit.HOURS))) {
                        dispatchDueAlert(task.getId());
                        sentCount++;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed checking due alert for task {}: {}", task.getId(), e.getMessage());
            }
        }
        log.info("⏰ [SCHEDULED] Daily Task Due Date Alert completed. Alerts sent: {}", sentCount);
    }

    /**
     * Automatic weekly job (Runs every Monday at 09:00 AM) to notify assignees of overdue uncompleted tasks.
     */
    @Scheduled(cron = "0 0 9 * * MON")
    @Transactional
    public void dispatchWeeklyOverdueAlerts() {
        log.info("⏰ [SCHEDULED] Running weekly Overdue Task Alert checker...");
        List<Task> activeTasks = taskRepository.findActiveTasksWithDueDate();
        LocalDate now = LocalDate.now();
        int sentCount = 0;

        for (Task task : activeTasks) {
            try {
                if (!"done".equalsIgnoreCase(task.getStatus()) && task.getDueDate() != null) {
                    LocalDate due = LocalDate.parse(task.getDueDate().trim());
                    if (due.isBefore(now)) {
                        dispatchDueAlert(task.getId());
                        sentCount++;
                    }
                }
            } catch (Exception e) {
                log.debug("Weekly alert check skipped for task {}: {}", task.getId(), e.getMessage());
            }
        }
        log.info("⏰ [SCHEDULED] Weekly Overdue Task Alert completed. Alerts sent: {}", sentCount);
    }

    private DueDateInfo parseDueDate(String rawDue) {
        if (rawDue == null || rawDue.isBlank()) {
            return new DueDateInfo(0, "Due Date not set", "DUE DATE NOTICE", "due-near", false);
        }

        String cleaned = rawDue.trim();
        LocalDate now = LocalDate.now();

        if (cleaned.equalsIgnoreCase("Today")) {
            return new DueDateInfo(0, "Due Today", "DUE TODAY", "due-today", true);
        }
        if (cleaned.equalsIgnoreCase("Tomorrow")) {
            return new DueDateInfo(1, "1 Day Left", "DUE IN 1 DAY", "due-near", true);
        }

        try {
            LocalDate dueDate = LocalDate.parse(cleaned);
            long days = ChronoUnit.DAYS.between(now, dueDate);

            if (days == 0) {
                return new DueDateInfo(0, "Due Today", "DUE TODAY", "due-today", true);
            } else if (days == 1) {
                return new DueDateInfo(1, "1 Day Left", "DUE IN 1 DAY", "due-near", true);
            } else if (days > 1) {
                String banner = "DUE IN " + days + " DAYS";
                String remaining = days + " Days Left";
                boolean isNear = days <= 3;
                return new DueDateInfo(days, remaining, banner, "due-near", isNear);
            } else {
                long overdueDays = Math.abs(days);
                String banner = "OVERDUE BY " + overdueDays + " " + (overdueDays == 1 ? "DAY" : "DAYS");
                String remaining = overdueDays + " " + (overdueDays == 1 ? "Day" : "Days") + " Overdue";
                return new DueDateInfo(days, remaining, banner, "due-today", true);
            }
        } catch (Exception ex) {
            return new DueDateInfo(0, cleaned, "TASK DUE ALERT", "due-near", false);
        }
    }

    public record DueDateInfo(long daysLeft, String timeRemainingText, String bannerText, String badgeClass, boolean isDueNearOrToday) {}

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
                .position(t.getPosition() != null ? t.getPosition() : 0)
                .progress(t.getProgress() != null ? t.getProgress() : 0)
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
