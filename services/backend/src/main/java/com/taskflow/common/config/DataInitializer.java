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
                    "workspace.view", "workspace.edit", "workspace.delete",
                    "space.view", "space.create", "space.edit", "space.delete",
                    "project.view", "project.create", "project.edit", "project.delete",
                    "task.view", "task.create", "task.edit", "task.delete", "task.assign", "task.comment", "task.move", "task.archive",
                    "dashboard.view", "dashboard.edit", "document.view", "document.edit",
                    "automation.view", "automation.manage", "billing.view", "billing.manage",
                    "users.invite", "users.remove", "audit.view", "team.create", "team.edit", "team.delete"
            );

            for (String code : permissionCodes) {
                Permission p = Permission.builder()
                        .code(code)
                        .name(code.replace('.', ' ').toUpperCase())
                        .category(code.split("\\.")[0])
                        .build();
                permissionRepository.save(p);
            }

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

            List<Permission> allPermissions = permissionRepository.findAll();
            for (Permission p : allPermissions) {
                rolePermissionRepository.save(RolePermission.builder()
                        .roleId(OWNER_ROLE_ID)
                        .permissionId(p.getId())
                        .build());
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
