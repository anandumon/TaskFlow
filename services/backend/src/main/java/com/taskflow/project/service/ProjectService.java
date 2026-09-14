package com.taskflow.project.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.project.dto.CreateProjectRequest;
import com.taskflow.project.dto.ProjectResponse;
import com.taskflow.project.dto.UpdateProjectRequest;
import com.taskflow.project.entity.Project;
import com.taskflow.project.entity.ProjectMember;
import com.taskflow.project.repository.ProjectMemberRepository;
import com.taskflow.project.repository.ProjectRepository;
import com.taskflow.rbac.domain.PermissionCode;
import com.taskflow.rbac.service.AuthorizationService;
import com.taskflow.task.entity.Task;
import com.taskflow.task.repository.TaskRepository;
import com.taskflow.workspace.entity.Workspace;
import com.taskflow.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final AuthorizationService authorizationService;

    private static final UUID PROJECT_ADMIN_ROLE_ID = UUID.fromString("c0000000-0000-0000-0000-000000000001");
    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    private UUID getAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.taskflow.common.security.UserPrincipal up) {
            return up.getId();
        }
        return null;
    }

    @Transactional
    public ProjectResponse createProject(UUID workspaceId, CreateProjectRequest request) {
        Workspace ws = workspaceRepository.findByIdAndDeletedFalse(workspaceId)
                .orElseThrow(() -> AppException.notFound("Workspace not found"));

        UUID userId = getAuthenticatedUserId();
        if (userId != null) {
            authorizationService.requireWorkspacePermission(userId, workspaceId, PermissionCode.PROJECT_CREATE);
        }

        String slug = toSlug(request.getName());
        int counter = 1;
        String baseSlug = slug;
        while (projectRepository.existsByWorkspaceIdAndSlugAndDeletedFalse(workspaceId, slug)) {
            slug = baseSlug + "-" + counter++;
        }

        String envs = request.getEnvironments() != null && !request.getEnvironments().isBlank()
                ? request.getEnvironments().trim()
                : "DEV,SIT,UAT,RELEASE,MAIN";

        Project project = Project.builder()
                .workspaceId(workspaceId)
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .progress(request.getProgress() != null ? request.getProgress() : 0)
                .color(request.getColor() != null ? request.getColor() : "#6366F1")
                .icon(request.getIcon() != null ? request.getIcon() : "folder")
                .environments(envs)
                .createdBy(userId)
                .build();

        project = projectRepository.save(project);

        // Assign Project Admin membership to creator
        if (userId != null) {
            projectMemberRepository.save(ProjectMember.builder()
                    .projectId(project.getId())
                    .userId(userId)
                    .roleId(PROJECT_ADMIN_ROLE_ID)
                    .status("ACTIVE")
                    .build());
        }

        log.info("Project created: {} [envs: {}] in workspace: {}", project.getName(), project.getEnvironments(), workspaceId);
        return toResponse(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjectsByWorkspace(UUID workspaceId) {
        workspaceRepository.findByIdAndDeletedFalse(workspaceId)
                .orElseThrow(() -> AppException.notFound("Workspace not found"));

        UUID userId = getAuthenticatedUserId();
        if (userId != null) {
            authorizationService.requireWorkspacePermission(userId, workspaceId, PermissionCode.WORKSPACE_VIEW);
        }

        return projectRepository.findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(workspaceId)
                .stream()
                .filter(p -> userId == null || authorizationService.hasProjectPermission(userId, p.getId(), PermissionCode.PROJECT_VIEW))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(UUID id) {
        Project project = projectRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Project not found"));

        UUID userId = getAuthenticatedUserId();
        if (userId != null) {
            authorizationService.requireProjectPermission(userId, id, PermissionCode.PROJECT_VIEW);
        }

        return toResponse(project);
    }

    @Transactional
    public ProjectResponse updateProject(UUID id, UpdateProjectRequest request) {
        Project project = projectRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Project not found"));

        UUID userId = getAuthenticatedUserId();
        if (userId != null) {
            authorizationService.requireProjectPermission(userId, id, PermissionCode.PROJECT_UPDATE);
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            project.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            project.setStatus(request.getStatus());
        }
        if (request.getProgress() != null) {
            project.setProgress(request.getProgress());
        }
        if (request.getColor() != null) {
            project.setColor(request.getColor());
        }
        if (request.getIcon() != null) {
            project.setIcon(request.getIcon());
        }
        if (request.getEnvironments() != null && !request.getEnvironments().isBlank()) {
            project.setEnvironments(request.getEnvironments().trim());
        }

        project = projectRepository.save(project);
        return toResponse(project);
    }

    @Transactional
    public void deleteProject(UUID id) {
        Project project = projectRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> AppException.notFound("Project not found"));

        UUID userId = getAuthenticatedUserId();
        if (userId != null) {
            authorizationService.requireProjectPermission(userId, id, PermissionCode.PROJECT_DELETE);
        }

        project.setDeleted(true);
        projectRepository.save(project);
        log.info("Project soft-deleted: {}", id);
    }

    private ProjectResponse toResponse(Project p) {
        List<Task> tasks = taskRepository.findByProjectIdAndDeletedFalseOrderByCreatedAtDesc(p.getId());
        long totalTasks = tasks.size();
        long completedTasks = tasks.stream().filter(t -> "done".equalsIgnoreCase(t.getStatus())).count();

        int progress = p.getProgress() != null ? p.getProgress() : 0;
        if (totalTasks > 0) {
            double weightedSum = tasks.stream().mapToDouble(t -> {
                String s = t.getStatus() != null ? t.getStatus().toLowerCase() : "todo";
                return switch (s) {
                    case "done" -> 100.0;
                    case "in_review" -> 75.0;
                    case "in_progress" -> 35.0;
                    default -> 0.0;
                };
            }).sum();
            progress = (int) Math.round(weightedSum / totalTasks);
        }

        return ProjectResponse.builder()
                .id(p.getId())
                .workspaceId(p.getWorkspaceId())
                .name(p.getName())
                .slug(p.getSlug())
                .description(p.getDescription())
                .status(p.getStatus())
                .progress(progress)
                .color(p.getColor())
                .icon(p.getIcon())
                .environments(p.getEnvironments())
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private String toSlug(String input) {
        String nowhitespace = WHITESPACE.matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NON_LATIN.matcher(normalized).replaceAll("");
        return slug.toLowerCase(Locale.ENGLISH).replaceAll("-+", "-").replaceAll("^-|-$", "");
    }
}
