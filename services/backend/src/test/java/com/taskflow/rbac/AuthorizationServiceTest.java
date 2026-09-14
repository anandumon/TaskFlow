package com.taskflow.rbac;

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
import com.taskflow.rbac.service.AuthorizationService;
import com.taskflow.task.entity.Task;
import com.taskflow.task.repository.TaskRepository;
import com.taskflow.workspace.entity.Workspace;
import com.taskflow.workspace.entity.WorkspaceMember;
import com.taskflow.workspace.repository.WorkspaceMemberRepository;
import com.taskflow.workspace.repository.WorkspaceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthorizationServiceTest {

    @Mock private OrganizationRepository organizationRepository;
    @Mock private OrganizationMemberRepository organizationMemberRepository;
    @Mock private WorkspaceRepository workspaceRepository;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RolePermissionRepository rolePermissionRepository;

    @InjectMocks
    private AuthorizationService authorizationService;

    private UUID userId;
    private UUID orgId;
    private UUID workspaceId;
    private UUID projectId;
    private UUID taskId;

    private Organization org;
    private Workspace workspace;
    private Project project;
    private Task task;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        orgId = UUID.randomUUID();
        workspaceId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        taskId = UUID.randomUUID();

        org = Organization.builder().name("Test Org").ownerId(UUID.randomUUID()).build();
        workspace = Workspace.builder().organizationId(orgId).name("Test WS").createdBy(UUID.randomUUID()).build();
        project = Project.builder().workspaceId(workspaceId).name("Test Project").createdBy(UUID.randomUUID()).build();
        task = Task.builder().workspaceId(workspaceId).projectId(projectId).title("Test Task").build();
    }

    @Test
    @DisplayName("Organization Owner has all organization permissions")
    void testOrgOwnerHasFullAccess() {
        org.setOwnerId(userId);
        when(organizationRepository.findByIdAndDeletedFalse(orgId)).thenReturn(Optional.of(org));

        boolean hasAccess = authorizationService.hasOrganizationPermission(userId, orgId, PermissionCode.ORGANIZATION_DELETE);
        assertTrue(hasAccess);
    }

    @Test
    @DisplayName("Non-member has no organization permissions")
    void testNonMemberDenied() {
        when(organizationRepository.findByIdAndDeletedFalse(orgId)).thenReturn(Optional.of(org));
        when(organizationMemberRepository.findByOrganizationIdAndUserIdAndStatus(orgId, userId, "ACTIVE"))
                .thenReturn(Optional.empty());

        boolean hasAccess = authorizationService.hasOrganizationPermission(userId, orgId, PermissionCode.ORGANIZATION_VIEW);
        assertFalse(hasAccess);

        assertThrows(AppException.class, () ->
                authorizationService.requireOrganizationPermission(userId, orgId, PermissionCode.ORGANIZATION_VIEW));
    }

    @Test
    @DisplayName("Parent Organization Owner has implicit access to projects")
    void testParentOrgOwnerHasProjectAccess() {
        org.setOwnerId(userId);
        when(projectRepository.findByIdAndDeletedFalse(projectId)).thenReturn(Optional.of(project));
        when(workspaceRepository.findByIdAndDeletedFalse(workspaceId)).thenReturn(Optional.of(workspace));
        when(organizationRepository.findByIdAndDeletedFalse(orgId)).thenReturn(Optional.of(org));

        boolean hasAccess = authorizationService.hasProjectPermission(userId, projectId, PermissionCode.PROJECT_DELETE);
        assertTrue(hasAccess);
    }

    @Test
    @DisplayName("Invited Project Member with Viewer role can VIEW but cannot EDIT or DELETE project")
    void testProjectViewerPermissions() {
        UUID viewerRoleId = UUID.fromString("c0000000-0000-0000-0000-000000000004");
        ProjectMember pm = ProjectMember.builder().projectId(projectId).userId(userId).roleId(viewerRoleId).status("ACTIVE").build();

        when(projectRepository.findByIdAndDeletedFalse(projectId)).thenReturn(Optional.of(project));
        when(workspaceRepository.findByIdAndDeletedFalse(workspaceId)).thenReturn(Optional.of(workspace));
        when(organizationRepository.findByIdAndDeletedFalse(orgId)).thenReturn(Optional.of(org));
        when(organizationMemberRepository.findByOrganizationIdAndUserIdAndStatus(orgId, userId, "ACTIVE")).thenReturn(Optional.empty());
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, "ACTIVE")).thenReturn(Optional.empty());
        when(projectMemberRepository.findByProjectIdAndUserIdAndStatus(projectId, userId, "ACTIVE")).thenReturn(Optional.of(pm));

        when(rolePermissionRepository.findPermissionCodesByRoleId(viewerRoleId))
                .thenReturn(Set.of("project.view", "task.view"));

        assertTrue(authorizationService.hasProjectPermission(userId, projectId, PermissionCode.PROJECT_VIEW));
        assertFalse(authorizationService.hasProjectPermission(userId, projectId, PermissionCode.PROJECT_DELETE));
    }

    @Test
    @DisplayName("Task Assignee with Project Viewer role can UPDATE their assigned task but CANNOT DELETE it")
    void testTaskAssigneePrivileges() {
        task.setAssigneeId(userId);

        UUID viewerRoleId = UUID.fromString("c0000000-0000-0000-0000-000000000004");
        ProjectMember pm = ProjectMember.builder().projectId(projectId).userId(userId).roleId(viewerRoleId).status("ACTIVE").build();

        when(taskRepository.findByIdAndDeletedFalse(taskId)).thenReturn(Optional.of(task));
        when(projectRepository.findByIdAndDeletedFalse(projectId)).thenReturn(Optional.of(project));
        when(workspaceRepository.findByIdAndDeletedFalse(workspaceId)).thenReturn(Optional.of(workspace));
        when(organizationRepository.findByIdAndDeletedFalse(orgId)).thenReturn(Optional.of(org));
        when(organizationMemberRepository.findByOrganizationIdAndUserIdAndStatus(orgId, userId, "ACTIVE")).thenReturn(Optional.empty());
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, "ACTIVE")).thenReturn(Optional.empty());
        when(projectMemberRepository.findByProjectIdAndUserIdAndStatus(projectId, userId, "ACTIVE")).thenReturn(Optional.of(pm));
        when(rolePermissionRepository.findPermissionCodesByRoleId(viewerRoleId))
                .thenReturn(Set.of("project.view", "task.view"));

        // Assignee can view and update status
        assertTrue(authorizationService.hasTaskPermission(userId, taskId, PermissionCode.TASK_VIEW));
        assertTrue(authorizationService.hasTaskPermission(userId, taskId, PermissionCode.TASK_UPDATE));
        assertTrue(authorizationService.hasTaskPermission(userId, taskId, PermissionCode.TASK_COMPLETE));

        // Assignee CANNOT delete the task!
        assertFalse(authorizationService.hasTaskPermission(userId, taskId, PermissionCode.TASK_DELETE));
    }
}
