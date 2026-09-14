package com.taskflow.identity.service;

import com.taskflow.identity.dto.UserResourceTreeResponse;
import com.taskflow.organization.entity.Organization;
import com.taskflow.organization.entity.OrganizationMember;
import com.taskflow.organization.repository.OrganizationMemberRepository;
import com.taskflow.organization.repository.OrganizationRepository;
import com.taskflow.project.entity.Project;
import com.taskflow.project.entity.ProjectMember;
import com.taskflow.project.repository.ProjectMemberRepository;
import com.taskflow.project.repository.ProjectRepository;
import com.taskflow.rbac.entity.Role;
import com.taskflow.rbac.repository.RoleRepository;
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
public class UserResourceService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final RoleRepository roleRepository;

    private static final UUID ORG_OWNER_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final UUID ORG_ADMIN_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000002");

    public UserResourceTreeResponse getUserResourceTree(UUID userId) {
        if (userId == null) {
            return UserResourceTreeResponse.builder().build();
        }

        // 1. Personal space
        UserResourceTreeResponse.PersonalSpaceDTO personalSpace = UserResourceTreeResponse.PersonalSpaceDTO.builder()
                .id(userId)
                .name("Personal Space")
                .description("Your private personal workspace and tasks")
                .build();

        // 2. Discover all accessible organizations
        // A. Owned organizations
        List<Organization> ownedOrgs = organizationRepository.findByOwnerIdAndDeletedFalse(userId);
        // B. Member organizations with status = 'ACTIVE'
        List<OrganizationMember> orgMemberships = organizationMemberRepository.findByUserIdAndStatus(userId, "ACTIVE");

        Map<UUID, Organization> accessibleOrgs = new LinkedHashMap<>();
        Map<UUID, String> orgRoleNames = new HashMap<>();

        for (Organization org : ownedOrgs) {
            accessibleOrgs.put(org.getId(), org);
            orgRoleNames.put(org.getId(), "OWNER");
        }

        for (OrganizationMember om : orgMemberships) {
            if (!accessibleOrgs.containsKey(om.getOrganizationId())) {
                organizationRepository.findByIdAndDeletedFalse(om.getOrganizationId()).ifPresent(org -> {
                    accessibleOrgs.put(org.getId(), org);
                    String roleName = om.getRoleId() != null ?
                            roleRepository.findById(om.getRoleId()).map(Role::getName).orElse("MEMBER") : "MEMBER";
                    orgRoleNames.put(org.getId(), roleName);
                });
            }
        }

        List<UserResourceTreeResponse.OrgResourceDTO> orgDTOs = new ArrayList<>();

        // Also check if user has direct workspace or project memberships in orgs not yet in list
        List<WorkspaceMember> wsMemberships = workspaceMemberRepository.findByUserIdAndStatus(userId, "ACTIVE");
        for (WorkspaceMember wm : wsMemberships) {
            workspaceRepository.findByIdAndDeletedFalse(wm.getWorkspaceId()).ifPresent(ws -> {
                if (!accessibleOrgs.containsKey(ws.getOrganizationId())) {
                    organizationRepository.findByIdAndDeletedFalse(ws.getOrganizationId()).ifPresent(org -> {
                        accessibleOrgs.put(org.getId(), org);
                        orgRoleNames.put(org.getId(), "GUEST");
                    });
                }
            });
        }

        List<ProjectMember> projMemberships = projectMemberRepository.findByUserIdAndStatus(userId, "ACTIVE");
        for (ProjectMember pm : projMemberships) {
            projectRepository.findByIdAndDeletedFalse(pm.getProjectId()).ifPresent(p -> {
                workspaceRepository.findByIdAndDeletedFalse(p.getWorkspaceId()).ifPresent(ws -> {
                    if (!accessibleOrgs.containsKey(ws.getOrganizationId())) {
                        organizationRepository.findByIdAndDeletedFalse(ws.getOrganizationId()).ifPresent(org -> {
                            accessibleOrgs.put(org.getId(), org);
                            orgRoleNames.put(org.getId(), "GUEST");
                        });
                    }
                });
            });
        }

        for (Organization org : accessibleOrgs.values()) {
            boolean isOwner = org.getOwnerId() != null && org.getOwnerId().equals(userId);
            String orgRole = orgRoleNames.getOrDefault(org.getId(), isOwner ? "OWNER" : "MEMBER");

            boolean isOrgAdmin = isOwner || "ADMIN".equalsIgnoreCase(orgRole);

            // Fetch workspaces in this organization
            List<Workspace> allWorkspacesInOrg = workspaceRepository.findByOrganizationIdAndDeletedFalse(org.getId());
            List<UserResourceTreeResponse.WorkspaceResourceDTO> wsDTOs = new ArrayList<>();

            for (Workspace ws : allWorkspacesInOrg) {
                boolean isWsCreator = ws.getCreatedBy() != null && ws.getCreatedBy().equals(userId);
                Optional<WorkspaceMember> wmOpt = workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(ws.getId(), userId, "ACTIVE");
                boolean hasDirectWsMembership = wmOpt.isPresent();

                // Check if user has any project membership inside this workspace
                List<Project> allProjectsInWs = projectRepository.findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(ws.getId());
                boolean hasChildProjectMembership = false;
                List<UserResourceTreeResponse.ProjectResourceDTO> projDTOs = new ArrayList<>();

                for (Project p : allProjectsInWs) {
                    boolean isProjCreator = p.getCreatedBy() != null && p.getCreatedBy().equals(userId);
                    Optional<ProjectMember> pmOpt = projectMemberRepository.findByProjectIdAndUserIdAndStatus(p.getId(), userId, "ACTIVE");
                    boolean hasDirectProjMembership = pmOpt.isPresent();

                    boolean canAccessProject = isOrgAdmin || isWsCreator || isProjCreator || hasDirectProjMembership;

                    if (canAccessProject) {
                        hasChildProjectMembership = true;
                        String projRole = "VIEWER";
                        if (isOrgAdmin || isWsCreator || isProjCreator) {
                            projRole = "ADMIN";
                        } else if (pmOpt.isPresent() && pmOpt.get().getRoleId() != null) {
                            projRole = roleRepository.findById(pmOpt.get().getRoleId()).map(Role::getName).orElse("EDITOR");
                        }

                        projDTOs.add(UserResourceTreeResponse.ProjectResourceDTO.builder()
                                .id(p.getId())
                                .name(p.getName())
                                .slug(p.getSlug())
                                .color(p.getColor())
                                .icon(p.getIcon())
                                .status(p.getStatus())
                                .role(projRole)
                                .build());
                    }
                }

                boolean canAccessWorkspace = isOrgAdmin || isWsCreator || hasDirectWsMembership || hasChildProjectMembership;

                if (canAccessWorkspace) {
                    String wsRole = "MEMBER";
                    if (isOrgAdmin || isWsCreator) {
                        wsRole = "ADMIN";
                    } else if (hasDirectWsMembership && wmOpt.get().getRoleId() != null) {
                        wsRole = roleRepository.findById(wmOpt.get().getRoleId()).map(Role::getName).orElse("MEMBER");
                    } else if (hasChildProjectMembership) {
                        wsRole = "GUEST";
                    }

                    wsDTOs.add(UserResourceTreeResponse.WorkspaceResourceDTO.builder()
                            .id(ws.getId())
                            .name(ws.getName())
                            .slug(ws.getSlug())
                            .color(ws.getColor())
                            .icon(ws.getIcon())
                            .role(wsRole)
                            .projects(projDTOs)
                            .build());
                }
            }

            orgDTOs.add(UserResourceTreeResponse.OrgResourceDTO.builder()
                    .id(org.getId())
                    .name(org.getName())
                    .slug(org.getSlug())
                    .logoUrl(org.getLogoUrl())
                    .role(orgRole)
                    .isOwner(isOwner)
                    .workspaces(wsDTOs)
                    .build());
        }

        return UserResourceTreeResponse.builder()
                .personalSpace(personalSpace)
                .organizations(orgDTOs)
                .build();
    }
}
