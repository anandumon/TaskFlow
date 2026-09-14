package com.taskflow.rbac.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.organization.entity.Organization;
import com.taskflow.organization.entity.OrganizationMember;
import com.taskflow.organization.repository.OrganizationMemberRepository;
import com.taskflow.organization.repository.OrganizationRepository;
import com.taskflow.project.entity.Project;
import com.taskflow.project.entity.ProjectMember;
import com.taskflow.project.repository.ProjectMemberRepository;
import com.taskflow.project.repository.ProjectRepository;
import com.taskflow.rbac.domain.PermissionCode;
import com.taskflow.rbac.entity.Role;
import com.taskflow.rbac.repository.RolePermissionRepository;
import com.taskflow.rbac.repository.RoleRepository;
import com.taskflow.task.entity.Task;
import com.taskflow.task.repository.TaskRepository;
import com.taskflow.workspace.entity.Workspace;
import com.taskflow.workspace.entity.WorkspaceMember;
import com.taskflow.workspace.repository.WorkspaceMemberRepository;
import com.taskflow.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    private static final UUID ORG_OWNER_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final UUID ORG_ADMIN_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000002");

    // =========================================================================
    // ORGANIZATION PERMISSIONS
    // =========================================================================

    public void requireOrganizationPermission(UUID userId, UUID organizationId, PermissionCode permission) {
        if (!hasOrganizationPermission(userId, organizationId, permission)) {
            log.warn("Access denied: User {} lacks {} on organization {}", userId, permission, organizationId);
            throw AppException.forbidden("Insufficient permissions for this organization operation");
        }
    }

    public boolean hasOrganizationPermission(UUID userId, UUID organizationId, PermissionCode permission) {
        if (userId == null || organizationId == null) return false;

        Organization org = organizationRepository.findByIdAndDeletedFalse(organizationId).orElse(null);
        if (org == null) return false;

        // Resource Owner has all permissions
        if (org.getOwnerId() != null && org.getOwnerId().equals(userId)) {
            return true;
        }

        // Active membership check
        Optional<OrganizationMember> memberOpt = organizationMemberRepository
                .findByOrganizationIdAndUserIdAndStatus(organizationId, userId, "ACTIVE");
        if (memberOpt.isEmpty()) return false;

        OrganizationMember member = memberOpt.get();
        if (member.getRoleId() == null) return false;

        if (ORG_OWNER_ROLE_ID.equals(member.getRoleId())) return true;
        if (permission == PermissionCode.ORGANIZATION_VIEW) return true;

        Set<String> permissionCodes = rolePermissionRepository.findPermissionCodesByRoleId(member.getRoleId());
        return permissionCodes.stream().anyMatch(permission::matches);
    }

    // =========================================================================
    // WORKSPACE PERMISSIONS
    // =========================================================================

    public void requireWorkspacePermission(UUID userId, UUID workspaceId, PermissionCode permission) {
        if (!hasWorkspacePermission(userId, workspaceId, permission)) {
            log.warn("Access denied: User {} lacks {} on workspace {}", userId, permission, workspaceId);
            throw AppException.forbidden("Insufficient permissions for this workspace operation");
        }
    }

    public boolean hasWorkspacePermission(UUID userId, UUID workspaceId, PermissionCode permission) {
        if (userId == null || workspaceId == null) return false;

        Workspace ws = workspaceRepository.findByIdAndDeletedFalse(workspaceId).orElse(null);
        if (ws == null) return false;

        UUID orgId = ws.getOrganizationId();

        // 1. Check parent Organization Owner or Admin
        Organization org = organizationRepository.findByIdAndDeletedFalse(orgId).orElse(null);
        if (org != null) {
            boolean isOrgOwner = (org.getOwnerId() != null && org.getOwnerId().equals(userId));
            Optional<OrganizationMember> orgMemberOpt = organizationMemberRepository
                    .findByOrganizationIdAndUserIdAndStatus(orgId, userId, "ACTIVE");

            if (!isOrgOwner && orgMemberOpt.isEmpty()) {
                return false;
            }

            if (isOrgOwner) {
                return true;
            }

            if (orgMemberOpt.isPresent()) {
                OrganizationMember om = orgMemberOpt.get();
                if (ORG_OWNER_ROLE_ID.equals(om.getRoleId()) || ORG_ADMIN_ROLE_ID.equals(om.getRoleId())) {
                    return true;
                }
                // If checking view and user has workspace.view at org level
                if (permission == PermissionCode.WORKSPACE_VIEW) {
                    Set<String> orgPerms = rolePermissionRepository.findPermissionCodesByRoleId(om.getRoleId());
                    if (orgPerms.stream().anyMatch(permission::matches)) {
                        return true;
                    }
                }
            }
        }

        // 2. Workspace creator has management permissions within the workspace
        if (ws.getCreatedBy() != null && ws.getCreatedBy().equals(userId)) {
            return true;
        }

        // 3. Workspace Member check
        Optional<WorkspaceMember> wsMemberOpt = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, "ACTIVE");
        if (wsMemberOpt.isPresent()) {
            WorkspaceMember wm = wsMemberOpt.get();
            if (permission == PermissionCode.WORKSPACE_VIEW) {
                return true;
            }
            if (wm.getRoleId() != null) {
                Set<String> permissionCodes = rolePermissionRepository.findPermissionCodesByRoleId(wm.getRoleId());
                if (permissionCodes.stream().anyMatch(permission::matches)) {
                    return true;
                }
            }
        }

        // 4. Project Membership check (active project members can view parent workspace)
        if (permission == PermissionCode.WORKSPACE_VIEW) {
            if (projectMemberRepository.existsByUserIdAndStatusAndWorkspaceId(userId, "ACTIVE", workspaceId)) {
                return true;
            }
        }

        return false;
    }

    // =========================================================================
    // PROJECT PERMISSIONS
    // =========================================================================

    public void requireProjectPermission(UUID userId, UUID projectId, PermissionCode permission) {
        if (!hasProjectPermission(userId, projectId, permission)) {
            log.warn("Access denied: User {} lacks {} on project {}", userId, permission, projectId);
            throw AppException.forbidden("Insufficient permissions for this project operation");
        }
    }

    public boolean hasProjectPermission(UUID userId, UUID projectId, PermissionCode permission) {
        if (userId == null || projectId == null) return false;

        Project project = projectRepository.findByIdAndDeletedFalse(projectId).orElse(null);
        if (project == null) return false;

        UUID workspaceId = project.getWorkspaceId();
        Workspace ws = workspaceRepository.findByIdAndDeletedFalse(workspaceId).orElse(null);
        if (ws == null) return false;

        UUID orgId = ws.getOrganizationId();

        // 1. Parent Org Owner & Tenant membership check
        Organization org = organizationRepository.findByIdAndDeletedFalse(orgId).orElse(null);
        if (org != null) {
            boolean isOrgOwner = (org.getOwnerId() != null && org.getOwnerId().equals(userId));
            Optional<OrganizationMember> orgMemberOpt = organizationMemberRepository
                    .findByOrganizationIdAndUserIdAndStatus(orgId, userId, "ACTIVE");

            if (!isOrgOwner && orgMemberOpt.isEmpty()) {
                return false;
            }

            if (isOrgOwner) {
                return true;
            }

            if (orgMemberOpt.isPresent()) {
                UUID roleId = orgMemberOpt.get().getRoleId();
                if (ORG_OWNER_ROLE_ID.equals(roleId) || ORG_ADMIN_ROLE_ID.equals(roleId)) {
                    return true;
                }
            }
        }

        // 3. Parent Workspace Admin / Creator
        if (ws.getCreatedBy() != null && ws.getCreatedBy().equals(userId)) {
            return true;
        }
        Optional<WorkspaceMember> wsMemberOpt = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, "ACTIVE");
        if (wsMemberOpt.isPresent()) {
            Set<String> wsPerms = rolePermissionRepository.findPermissionCodesByRoleId(wsMemberOpt.get().getRoleId());
            if (wsPerms.stream().anyMatch(p -> PermissionCode.PROJECT_DELETE.matches(p) || PermissionCode.PROJECT_UPDATE.matches(p))) {
                return true;
            }
            if (wsPerms.stream().anyMatch(permission::matches)) {
                return true;
            }
        }

        // 4. Project Creator
        if (project.getCreatedBy() != null && project.getCreatedBy().equals(userId)) {
            return true;
        }

        // 5. Project Member
        Optional<ProjectMember> pmOpt = projectMemberRepository
                .findByProjectIdAndUserIdAndStatus(projectId, userId, "ACTIVE");
        if (pmOpt.isEmpty()) return false;

        ProjectMember pm = pmOpt.get();
        if (permission == PermissionCode.PROJECT_VIEW || permission == PermissionCode.TASK_VIEW) {
            return true;
        }
        if (pm.getRoleId() == null) return false;

        Set<String> permissionCodes = rolePermissionRepository.findPermissionCodesByRoleId(pm.getRoleId());
        return permissionCodes.stream().anyMatch(permission::matches);
    }

    // =========================================================================
    // TASK PERMISSIONS
    // =========================================================================

    public void requireTaskPermission(UUID userId, UUID taskId, PermissionCode permission) {
        if (!hasTaskPermission(userId, taskId, permission)) {
            log.warn("Access denied: User {} lacks {} on task {}", userId, permission, taskId);
            throw AppException.forbidden("Insufficient permissions for this task operation");
        }
    }

    public boolean hasTaskPermission(UUID userId, UUID taskId, PermissionCode permission) {
        if (userId == null || taskId == null) return false;

        Task task = taskRepository.findByIdAndDeletedFalse(taskId).orElse(null);
        if (task == null) return false;

        // If task has a project, evaluate project permissions
        if (task.getProjectId() != null) {
            // 1. Admins (Org, Workspace, Project) have unrestricted task management
            if (hasProjectPermission(userId, task.getProjectId(), PermissionCode.PROJECT_DELETE) ||
                hasProjectPermission(userId, task.getProjectId(), PermissionCode.PROJECT_MANAGE_ROLES)) {
                return true;
            }

            // 2. All project members can view all tasks in the project
            if (permission == PermissionCode.TASK_VIEW) {
                return hasProjectPermission(userId, task.getProjectId(), PermissionCode.PROJECT_VIEW);
            }

            // 3. Regular members cannot delete any tasks
            if (permission == PermissionCode.TASK_DELETE) {
                return false;
            }

            // 4. Regular members can ONLY edit, complete, comment or move tasks assigned to them or created by them
            boolean canViewProject = hasProjectPermission(userId, task.getProjectId(), PermissionCode.PROJECT_VIEW);
            if (canViewProject) {
                boolean isAssignee = (task.getAssigneeId() != null && task.getAssigneeId().equals(userId));
                boolean isCreator = (task.getCreatedBy() != null && task.getCreatedBy().equals(userId));

                if (isAssignee || isCreator) {
                    return permission == PermissionCode.TASK_UPDATE ||
                           permission == PermissionCode.TASK_COMPLETE ||
                           permission == PermissionCode.TASK_COMMENT ||
                           permission == PermissionCode.TASK_MOVE;
                }
            }
            return false;
        }

        // Standalone task within workspace
        if (task.getWorkspaceId() != null) {
            if (hasWorkspacePermission(userId, task.getWorkspaceId(), PermissionCode.WORKSPACE_DELETE) ||
                hasWorkspacePermission(userId, task.getWorkspaceId(), PermissionCode.WORKSPACE_UPDATE)) {
                return true;
            }
            if (permission == PermissionCode.TASK_VIEW) {
                return hasWorkspacePermission(userId, task.getWorkspaceId(), PermissionCode.WORKSPACE_VIEW);
            }
            if (permission == PermissionCode.TASK_DELETE) {
                return false;
            }
            boolean canViewWs = hasWorkspacePermission(userId, task.getWorkspaceId(), PermissionCode.WORKSPACE_VIEW);
            if (canViewWs) {
                boolean isAssignee = (task.getAssigneeId() != null && task.getAssigneeId().equals(userId));
                boolean isCreator = (task.getCreatedBy() != null && task.getCreatedBy().equals(userId));
                if (isAssignee || isCreator) {
                    return permission == PermissionCode.TASK_UPDATE ||
                           permission == PermissionCode.TASK_COMPLETE ||
                           permission == PermissionCode.TASK_COMMENT ||
                           permission == PermissionCode.TASK_MOVE;
                }
            }
        }

        return false;
    }

    // =========================================================================
    // DELEGATION & INVITATION VALIDATION
    // =========================================================================

    public boolean canInvite(UUID userId, String scope, UUID resourceId, UUID targetRoleId) {
        if (userId == null || scope == null || resourceId == null) return false;

        String upperScope = scope.trim().toUpperCase();
        switch (upperScope) {
            case "ORGANIZATION":
                if (!hasOrganizationPermission(userId, resourceId, PermissionCode.ORGANIZATION_INVITE)) {
                    return false;
                }
                break;
            case "WORKSPACE":
                if (!hasWorkspacePermission(userId, resourceId, PermissionCode.WORKSPACE_INVITE)) {
                    return false;
                }
                break;
            case "PROJECT":
                if (!hasProjectPermission(userId, resourceId, PermissionCode.PROJECT_INVITE)) {
                    return false;
                }
                break;
            default:
                return false;
        }

        if (targetRoleId != null) {
            return canAssignRole(userId, targetRoleId);
        }
        return true;
    }

    public boolean canAssignRole(UUID actorUserId, UUID targetRoleId) {
        if (actorUserId == null || targetRoleId == null) return false;

        // No one except Owner can assign Owner role
        if (ORG_OWNER_ROLE_ID.equals(targetRoleId)) {
            Role targetRole = roleRepository.findById(targetRoleId).orElse(null);
            if (targetRole != null && targetRole.getOrganizationId() != null) {
                Organization org = organizationRepository.findByIdAndDeletedFalse(targetRole.getOrganizationId()).orElse(null);
                return org != null && org.getOwnerId() != null && org.getOwnerId().equals(actorUserId);
            }
            return false;
        }

        return true;
    }

    public Set<String> getEffectivePermissionsForProject(UUID userId, UUID projectId) {
        Set<String> effective = new HashSet<>();
        for (PermissionCode code : PermissionCode.values()) {
            if (hasProjectPermission(userId, projectId, code)) {
                effective.addAll(code.getCodes());
            }
        }
        return effective;
    }
}
