package com.taskflow.organization.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.organization.dto.*;
import com.taskflow.organization.entity.Organization;
import com.taskflow.organization.entity.OrganizationMember;
import com.taskflow.organization.repository.OrganizationMemberRepository;
import com.taskflow.organization.repository.OrganizationRepository;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
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

import java.text.Normalizer;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final com.taskflow.project.repository.ProjectRepository projectRepository;
    private final com.taskflow.project.repository.ProjectMemberRepository projectMemberRepository;
    private final com.taskflow.rbac.service.AuthorizationService authorizationService;

    private static final UUID OWNER_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final UUID WORKSPACE_ADMIN_ROLE_ID = UUID.fromString("b0000000-0000-0000-0000-000000000001");
    private static final UUID MEMBER_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000004");

    @Transactional
    public OrganizationResponse create(UUID userId, CreateOrganizationRequest request) {
        String slug = generateSlug(request.getName());

        Organization org = Organization.builder()
                .name(request.getName().trim())
                .slug(slug)
                .ownerId(userId)
                .build();

        org = organizationRepository.save(org);

        // Add creator as owner member
        OrganizationMember ownerMember = OrganizationMember.builder()
                .organizationId(org.getId())
                .userId(userId)
                .roleId(OWNER_ROLE_ID)
                .status("ACTIVE")
                .build();
        memberRepository.save(ownerMember);

        log.info("Organization created: {} by user: {}", org.getName(), userId);
        return mapToResponse(org);
    }

    @Transactional
    public List<OrganizationResponse> listByUser(UUID userId) {
        List<Organization> orgs = organizationRepository.findAllByMemberUserId(userId);
        if (orgs.isEmpty()) {
            User user = userRepository.findByIdAndDeletedFalse(userId).orElse(null);
            String orgName = (user != null && user.getDisplayName() != null && !user.getDisplayName().isBlank())
                    ? user.getDisplayName().trim() + "'s Organization"
                    : "My Organization";

            Organization org = Organization.builder()
                    .name(orgName)
                    .slug(generateSlug(orgName))
                    .ownerId(userId)
                    .build();
            org = organizationRepository.save(org);

            OrganizationMember ownerMember = OrganizationMember.builder()
                    .organizationId(org.getId())
                    .userId(userId)
                    .roleId(OWNER_ROLE_ID)
                    .status("ACTIVE")
                    .build();
            memberRepository.save(ownerMember);

            String wsName = "Primary Workspace";
            Workspace ws = Workspace.builder()
                    .organizationId(org.getId())
                    .name(wsName)
                    .slug(generateSlug(wsName))
                    .description("Default workspace for your projects and tasks")
                    .color("#6366F1")
                    .icon("briefcase")
                    .createdBy(userId)
                    .build();
            ws = workspaceRepository.save(ws);

            WorkspaceMember wsMember = WorkspaceMember.builder()
                    .workspaceId(ws.getId())
                    .userId(userId)
                    .roleId(WORKSPACE_ADMIN_ROLE_ID)
                    .status("ACTIVE")
                    .build();
            workspaceMemberRepository.save(wsMember);

            log.info("Auto-provisioned default organization '{}' and workspace '{}' for user {}", org.getName(), ws.getName(), userId);
            orgs = List.of(org);
        }

        return orgs.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrganizationResponse getById(UUID orgId, UUID userId) {
        Organization org = findOrgOrThrow(orgId);
        authorizationService.requireOrganizationPermission(userId, orgId, com.taskflow.rbac.domain.PermissionCode.ORGANIZATION_VIEW);
        return mapToResponse(org);
    }

    @Transactional
    public OrganizationResponse update(UUID orgId, UUID userId, UpdateOrganizationRequest request) {
        Organization org = findOrgOrThrow(orgId);
        authorizationService.requireOrganizationPermission(userId, orgId, com.taskflow.rbac.domain.PermissionCode.ORGANIZATION_UPDATE);

        if (request.getName() != null) {
            org.setName(request.getName().trim());
        }
        if (request.getLogoUrl() != null) {
            org.setLogoUrl(request.getLogoUrl());
        }

        org = organizationRepository.save(org);
        log.info("Organization updated: {} by user: {}", orgId, userId);
        return mapToResponse(org);
    }

    @Transactional
    public void delete(UUID orgId, UUID userId) {
        Organization org = findOrgOrThrow(orgId);
        authorizationService.requireOrganizationPermission(userId, orgId, com.taskflow.rbac.domain.PermissionCode.ORGANIZATION_DELETE);
        org.softDelete();
        organizationRepository.save(org);
        log.info("Organization deleted: {} by user: {}", orgId, userId);
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(UUID orgId, UUID userId) {
        authorizationService.requireOrganizationPermission(userId, orgId, com.taskflow.rbac.domain.PermissionCode.ORGANIZATION_VIEW);
        List<OrganizationMember> members = memberRepository.findByOrganizationId(orgId);

        return members.stream().map(member -> {
            User user = userRepository.findByIdAndDeletedFalse(member.getUserId()).orElse(null);
            String roleName = roleRepository.findById(member.getRoleId())
                    .map(Role::getName).orElse("Member");
            return MemberResponse.builder()
                    .id(member.getId().toString())
                    .userId(member.getUserId().toString())
                    .email(user != null ? user.getEmail() : null)
                    .firstName(user != null ? user.getFirstName() : null)
                    .lastName(user != null ? user.getLastName() : null)
                    .avatarUrl(user != null ? user.getAvatarUrl() : null)
                    .role(roleName)
                    .roleId(member.getRoleId().toString())
                    .joinedAt(member.getJoinedAt())
                    .build();
        }).toList();
    }

    @Transactional
    public MemberResponse addMember(UUID orgId, UUID userId, UUID targetUserId, UUID roleId) {
        authorizationService.requireOrganizationPermission(userId, orgId, com.taskflow.rbac.domain.PermissionCode.ORGANIZATION_MEMBERS_MANAGE);

        if (memberRepository.existsByOrganizationIdAndUserId(orgId, targetUserId)) {
            throw AppException.conflict("MEMBER_EXISTS", "User is already a member of this organization");
        }

        UUID effectiveRoleId = roleId != null ? roleId : MEMBER_ROLE_ID;

        OrganizationMember member = OrganizationMember.builder()
                .organizationId(orgId)
                .userId(targetUserId)
                .roleId(effectiveRoleId)
                .status("ACTIVE")
                .build();
        member = memberRepository.save(member);

        User user = userRepository.findByIdAndDeletedFalse(targetUserId)
                .orElseThrow(() -> AppException.notFound("User", targetUserId));
        String roleName = roleRepository.findById(effectiveRoleId)
                .map(Role::getName).orElse("Member");

        log.info("Member added to org {}: user {}", orgId, targetUserId);
        return MemberResponse.builder()
                .id(member.getId().toString())
                .userId(targetUserId.toString())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(user.getAvatarUrl())
                .role(roleName)
                .roleId(effectiveRoleId.toString())
                .joinedAt(member.getJoinedAt())
                .build();
    }

    @Transactional
    public void removeMember(UUID orgId, UUID userId, UUID memberId) {
        Organization org = findOrgOrThrow(orgId);
        authorizationService.requireOrganizationPermission(userId, orgId, com.taskflow.rbac.domain.PermissionCode.ORGANIZATION_MEMBERS_MANAGE);

        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> AppException.notFound("Member", memberId));

        if (member.getUserId().equals(org.getOwnerId())) {
            throw AppException.badRequest("CANNOT_REMOVE_OWNER", "Cannot remove the organization owner");
        }

        memberRepository.delete(member);

        // Cascade remove workspace and project memberships in this organization
        List<Workspace> workspaces = workspaceRepository.findByOrganizationIdAndDeletedFalse(orgId);
        for (Workspace w : workspaces) {
            workspaceMemberRepository.deleteByWorkspaceIdAndUserId(w.getId(), member.getUserId());
            List<com.taskflow.project.entity.Project> projects = projectRepository.findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(w.getId());
            for (com.taskflow.project.entity.Project p : projects) {
                projectMemberRepository.deleteByProjectIdAndUserId(p.getId(), member.getUserId());
            }
        }

        log.info("Member removed from org {}: member {}", orgId, memberId);
    }

    @Transactional
    public void updateMemberRole(UUID orgId, UUID userId, UUID memberId, UUID newRoleId) {
        authorizationService.requireOrganizationPermission(userId, orgId, com.taskflow.rbac.domain.PermissionCode.ORGANIZATION_MEMBERS_MANAGE);

        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> AppException.notFound("Member", memberId));

        member.setRoleId(newRoleId);
        memberRepository.save(member);
        log.info("Member role updated in org {}: member {} -> role {}", orgId, memberId, newRoleId);
    }

    // ── Helpers ──────────────────────────────────────────────

    private Organization findOrgOrThrow(UUID orgId) {
        return organizationRepository.findByIdAndDeletedFalse(orgId)
                .orElseThrow(() -> AppException.notFound("Organization", orgId));
    }

    private void assertMember(UUID orgId, UUID userId) {
        if (!memberRepository.existsByOrganizationIdAndUserId(orgId, userId)) {
            throw AppException.forbidden("You are not a member of this organization");
        }
    }

    private String generateSlug(String name) {
        String normalized = Normalizer.normalize(name.toLowerCase().trim(), Normalizer.Form.NFD);
        String slug = Pattern.compile("[^a-z0-9\\s-]").matcher(normalized).replaceAll("");
        slug = slug.trim().replaceAll("[\\s-]+", "-");

        String baseSlug = slug;
        int counter = 1;
        while (organizationRepository.existsBySlugAndDeletedFalse(slug)) {
            slug = baseSlug + "-" + counter++;
        }
        return slug;
    }

    private OrganizationResponse mapToResponse(Organization org) {
        return OrganizationResponse.builder()
                .id(org.getId().toString())
                .name(org.getName())
                .slug(org.getSlug())
                .logoUrl(org.getLogoUrl())
                .plan(org.getPlan())
                .ownerId(org.getOwnerId().toString())
                .createdAt(org.getCreatedAt())
                .build();
    }
}
