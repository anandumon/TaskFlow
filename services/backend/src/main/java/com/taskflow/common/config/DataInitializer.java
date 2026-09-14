package com.taskflow.common.config;

import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.organization.entity.Organization;
import com.taskflow.organization.entity.OrganizationMember;
import com.taskflow.organization.repository.OrganizationMemberRepository;
import com.taskflow.organization.repository.OrganizationRepository;
import com.taskflow.rbac.entity.Permission;
import com.taskflow.rbac.entity.Role;
import com.taskflow.rbac.entity.RolePermission;
import com.taskflow.rbac.repository.PermissionRepository;
import com.taskflow.rbac.repository.RolePermissionRepository;
import com.taskflow.rbac.repository.RoleRepository;
import com.taskflow.workspace.entity.Workspace;
import com.taskflow.workspace.entity.WorkspaceMember;
import com.taskflow.workspace.repository.WorkspaceMemberRepository;
import com.taskflow.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${taskflow.admin.email:admin@taskflow.dev}")
    private String adminEmail;

    @Value("${taskflow.admin.password:Admin@TaskFlow2026}")
    private String adminPassword;

    @Value("${taskflow.admin.first-name:Admin}")
    private String adminFirstName;

    @Value("${taskflow.admin.last-name:User}")
    private String adminLastName;

    public static final UUID OWNER_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    public static final UUID ADMIN_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000002");
    public static final UUID MEMBER_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000004");

    @Override
    @Transactional
    public void run(String... args) {
        seedRbac();
        seedAdminUser();
    }

    private void seedRbac() {
        if (roleRepository.count() == 0) {
            log.info("Seeding system roles and permissions...");

            List<String> permissionCodes = List.of(
                    // Dot notation
                    "organization.view", "organization.edit", "organization.delete",
                    "workspace.view", "workspace.create", "workspace.edit", "workspace.delete",
                    "space.view", "space.create", "space.edit", "space.delete",
                    "project.view", "project.create", "project.edit", "project.delete",
                    "task.view", "task.create", "task.edit", "task.delete", "task.assign", "task.comment", "task.move", "task.archive",
                    "dashboard.view", "dashboard.edit", "document.view", "document.edit",
                    "automation.view", "automation.manage", "billing.view", "billing.manage",
                    "users.invite", "users.remove", "audit.view", "team.create", "team.edit", "team.delete",
                    // Uppercase notation
                    "ORGANIZATION_VIEW", "ORGANIZATION_UPDATE", "ORGANIZATION_DELETE", "ORGANIZATION_INVITE", "ORGANIZATION_REMOVE_MEMBER", "ORGANIZATION_MANAGE_ROLES",
                    "WORKSPACE_VIEW", "WORKSPACE_CREATE", "WORKSPACE_UPDATE", "WORKSPACE_DELETE", "WORKSPACE_INVITE", "WORKSPACE_REMOVE_MEMBER",
                    "PROJECT_VIEW", "PROJECT_CREATE", "PROJECT_UPDATE", "PROJECT_DELETE", "PROJECT_INVITE", "PROJECT_REMOVE_MEMBER", "PROJECT_MANAGE_ROLES",
                    "TASK_VIEW", "TASK_CREATE", "TASK_UPDATE", "TASK_DELETE", "TASK_ASSIGN", "TASK_COMMENT", "TASK_COMPLETE", "TASK_REOPEN", "TASK_MOVE"
            );

            Map<String, Permission> permMap = new java.util.HashMap<>();
            for (String code : permissionCodes) {
                Permission p = permissionRepository.findByCode(code).orElseGet(() ->
                    permissionRepository.save(Permission.builder()
                            .code(code)
                            .name(code.replace('.', '_').replace('_', ' ').toUpperCase())
                            .category(code.contains(".") ? code.split("\\.")[0] : code.split("_")[0].toLowerCase())
                            .build())
                );
                permMap.put(code, p);
            }

            // 1. Organization Roles
            Role owner = Role.builder()
                    .id(OWNER_ROLE_ID)
                    .name("Owner")
                    .description("Full control over the organization")
                    .isSystem(true)
                    .build();
            roleRepository.save(owner);

            Role admin = Role.builder()
                    .id(ADMIN_ROLE_ID)
                    .name("Admin")
                    .description("Administrative access")
                    .isSystem(true)
                    .build();
            roleRepository.save(admin);

            Role member = Role.builder()
                    .id(MEMBER_ROLE_ID)
                    .name("Member")
                    .description("Standard member access")
                    .isSystem(true)
                    .isDefault(true)
                    .build();
            roleRepository.save(member);

            // 2. Workspace Roles
            UUID wsAdminId = UUID.fromString("b0000000-0000-0000-0000-000000000001");
            UUID wsMemberId = UUID.fromString("b0000000-0000-0000-0000-000000000002");
            UUID wsViewerId = UUID.fromString("b0000000-0000-0000-0000-000000000003");

            roleRepository.save(Role.builder().id(wsAdminId).name("Workspace Admin").description("Full control over workspace and projects").isSystem(true).build());
            roleRepository.save(Role.builder().id(wsMemberId).name("Workspace Member").description("Can view workspace and edit projects and tasks").isSystem(true).isDefault(true).build());
            roleRepository.save(Role.builder().id(wsViewerId).name("Workspace Viewer").description("Read-only access to workspace and projects").isSystem(true).build());

            // 3. Project Roles
            UUID projAdminId = UUID.fromString("c0000000-0000-0000-0000-000000000001");
            UUID projEditorId = UUID.fromString("c0000000-0000-0000-0000-000000000002");
            UUID projCommenterId = UUID.fromString("c0000000-0000-0000-0000-000000000003");
            UUID projViewerId = UUID.fromString("c0000000-0000-0000-0000-000000000004");

            roleRepository.save(Role.builder().id(projAdminId).name("Project Admin").description("Full control over project").isSystem(true).build());
            roleRepository.save(Role.builder().id(projEditorId).name("Project Editor").description("Can manage tasks within project").isSystem(true).isDefault(true).build());
            roleRepository.save(Role.builder().id(projCommenterId).name("Project Commenter").description("Can view and comment").isSystem(true).build());
            roleRepository.save(Role.builder().id(projViewerId).name("Project Viewer").description("Read-only access to project and tasks").isSystem(true).build());

            // Assign permissions
            // Owner & Admin gets all permissions
            for (Permission p : permMap.values()) {
                rolePermissionRepository.save(RolePermission.builder().roleId(OWNER_ROLE_ID).permissionId(p.getId()).build());
                rolePermissionRepository.save(RolePermission.builder().roleId(ADMIN_ROLE_ID).permissionId(p.getId()).build());
                rolePermissionRepository.save(RolePermission.builder().roleId(wsAdminId).permissionId(p.getId()).build());
                rolePermissionRepository.save(RolePermission.builder().roleId(projAdminId).permissionId(p.getId()).build());
            }

            // Member / Editor roles
            List<String> editorCodes = List.of(
                    "workspace.view", "project.view", "project.create", "task.view", "task.create", "task.edit", "task.assign", "task.comment", "task.move",
                    "WORKSPACE_VIEW", "PROJECT_VIEW", "PROJECT_CREATE", "TASK_VIEW", "TASK_CREATE", "TASK_UPDATE", "TASK_ASSIGN", "TASK_COMMENT", "TASK_COMPLETE", "TASK_MOVE"
            );
            for (String code : editorCodes) {
                Permission p = permMap.get(code);
                if (p != null) {
                    rolePermissionRepository.save(RolePermission.builder().roleId(MEMBER_ROLE_ID).permissionId(p.getId()).build());
                    rolePermissionRepository.save(RolePermission.builder().roleId(wsMemberId).permissionId(p.getId()).build());
                    rolePermissionRepository.save(RolePermission.builder().roleId(projEditorId).permissionId(p.getId()).build());
                }
            }

            // Viewer roles
            List<String> viewerCodes = List.of(
                    "workspace.view", "project.view", "task.view",
                    "WORKSPACE_VIEW", "PROJECT_VIEW", "TASK_VIEW"
            );
            for (String code : viewerCodes) {
                Permission p = permMap.get(code);
                if (p != null) {
                    rolePermissionRepository.save(RolePermission.builder().roleId(wsViewerId).permissionId(p.getId()).build());
                    rolePermissionRepository.save(RolePermission.builder().roleId(projViewerId).permissionId(p.getId()).build());
                    rolePermissionRepository.save(RolePermission.builder().roleId(projCommenterId).permissionId(p.getId()).build());
                }
            }
            log.info("RBAC seeded successfully.");
        }
    }

    private void seedAdminUser() {
        if (adminEmail == null || adminEmail.isBlank()) {
            return;
        }

        String normalizedEmail = adminEmail.toLowerCase().trim();
        Optional<User> adminOpt = userRepository.findByEmailAndDeletedFalse(normalizedEmail);
        if (adminOpt.isPresent()) {
            User existingAdmin = adminOpt.get();
            existingAdmin.setPasswordHash(passwordEncoder.encode(adminPassword));
            existingAdmin.setEmailVerified(true);
            existingAdmin.setStatus("ACTIVE");
            userRepository.save(existingAdmin);
            log.info("System administrator credentials synchronized.");
            return;
        }

        log.info("Initializing system administrator user in database...");

            User admin = User.builder()
                    .email(normalizedEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .firstName(adminFirstName)
                    .lastName(adminLastName)
                    .displayName(adminFirstName + " " + adminLastName)
                    .status("ACTIVE")
                    .emailVerified(true)
                    .authProvider("LOCAL")
                    .build();
            final User savedAdmin = userRepository.save(admin);

            // Default organization for the admin
            Organization org = organizationRepository.findAll().stream().findFirst().orElseGet(() -> {
                Organization newOrg = Organization.builder()
                        .name("TaskFlow Workspace")
                        .slug("taskflow-workspace")
                        .plan("PRO")
                        .ownerId(savedAdmin.getId())
                        .build();
                return organizationRepository.save(newOrg);
            });

            if (!organizationMemberRepository.existsByOrganizationIdAndUserId(org.getId(), savedAdmin.getId())) {
                OrganizationMember member = OrganizationMember.builder()
                        .organizationId(org.getId())
                        .userId(savedAdmin.getId())
                        .roleId(OWNER_ROLE_ID)
                        .build();
                organizationMemberRepository.save(member);
            }

            // Default workspace
            Workspace ws = workspaceRepository.findAll().stream().findFirst().orElseGet(() -> {
                Workspace newWs = Workspace.builder()
                        .organizationId(org.getId())
                        .name("Primary Workspace")
                        .slug("primary-workspace")
                        .description("Default team workspace")
                        .color("#6366F1")
                        .icon("briefcase")
                        .createdBy(savedAdmin.getId())
                        .build();
                return workspaceRepository.save(newWs);
            });

            if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(ws.getId(), savedAdmin.getId())) {
                WorkspaceMember wsMember = WorkspaceMember.builder()
                        .workspaceId(ws.getId())
                        .userId(savedAdmin.getId())
                        .roleId(OWNER_ROLE_ID)
                        .build();
                workspaceMemberRepository.save(wsMember);
            }

            log.info("System administrator initialized successfully in database.");
    }
}
