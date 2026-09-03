package com.taskflow.workspace.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.organization.repository.OrganizationMemberRepository;
import com.taskflow.rbac.entity.Role;
import com.taskflow.rbac.repository.RoleRepository;
import com.taskflow.workspace.dto.*;
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
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final OrganizationMemberRepository orgMemberRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    private static final UUID MEMBER_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000004");

    @Transactional
    public WorkspaceResponse create(UUID orgId, UUID userId, CreateWorkspaceRequest request) {
        assertOrgMember(orgId, userId);
        String slug = generateSlug(orgId, request.getName());

        Workspace ws = Workspace.builder()
                .organizationId(orgId)
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription())
                .color(request.getColor() != null ? request.getColor() : "#6366F1")
                .icon(request.getIcon() != null ? request.getIcon() : "briefcase")
                .createdBy(userId)
                .build();
        ws = workspaceRepository.save(ws);

        // Add creator as member
        WorkspaceMember member = WorkspaceMember.builder()
                .workspaceId(ws.getId())
                .userId(userId)
                .roleId(MEMBER_ROLE_ID)
                .build();
        memberRepository.save(member);

        log.info("Workspace created: {} in org: {}", ws.getName(), orgId);
        return mapToResponse(ws);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponse> listByOrg(UUID orgId, UUID userId) {
        assertOrgMember(orgId, userId);
        return workspaceRepository.findByOrganizationIdAndDeletedFalse(orgId)
                .stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse getById(UUID wsId, UUID userId) {
        Workspace ws = findOrThrow(wsId);
        assertOrgMember(ws.getOrganizationId(), userId);
        return mapToResponse(ws);
    }

    @Transactional
    public WorkspaceResponse update(UUID wsId, UUID userId, UpdateWorkspaceRequest request) {
        Workspace ws = findOrThrow(wsId);
        assertOrgMember(ws.getOrganizationId(), userId);

        if (request.getName() != null) ws.setName(request.getName().trim());
        if (request.getDescription() != null) ws.setDescription(request.getDescription());
        if (request.getColor() != null) ws.setColor(request.getColor());
        if (request.getIcon() != null) ws.setIcon(request.getIcon());

        ws = workspaceRepository.save(ws);
        return mapToResponse(ws);
    }

    @Transactional
    public void delete(UUID wsId, UUID userId) {
        Workspace ws = findOrThrow(wsId);
        assertOrgMember(ws.getOrganizationId(), userId);
        ws.softDelete();
        workspaceRepository.save(ws);
        log.info("Workspace deleted: {} by user: {}", wsId, userId);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMemberResponse> listMembers(UUID wsId, UUID userId) {
        Workspace ws = findOrThrow(wsId);
        assertOrgMember(ws.getOrganizationId(), userId);

        return memberRepository.findByWorkspaceId(wsId).stream().map(m -> {
            User user = userRepository.findByIdAndDeletedFalse(m.getUserId()).orElse(null);
            String roleName = m.getRoleId() != null ?
                    roleRepository.findById(m.getRoleId()).map(Role::getName).orElse("Member") : "Member";
            return WorkspaceMemberResponse.builder()
                    .id(m.getId().toString()).userId(m.getUserId().toString())
                    .email(user != null ? user.getEmail() : null)
                    .displayName(user != null ? user.getDisplayName() : null)
                    .avatarUrl(user != null ? user.getAvatarUrl() : null)
                    .role(roleName).joinedAt(m.getJoinedAt()).build();
        }).toList();
    }

    @Transactional
    public void addMember(UUID wsId, UUID userId, UUID targetUserId, UUID roleId) {
        Workspace ws = findOrThrow(wsId);
        assertOrgMember(ws.getOrganizationId(), userId);

        if (memberRepository.existsByWorkspaceIdAndUserId(wsId, targetUserId)) {
            throw AppException.conflict("MEMBER_EXISTS", "User is already a member of this workspace");
        }

        WorkspaceMember member = WorkspaceMember.builder()
                .workspaceId(wsId).userId(targetUserId)
                .roleId(roleId != null ? roleId : MEMBER_ROLE_ID).build();
        memberRepository.save(member);
    }

    @Transactional
    public void removeMember(UUID wsId, UUID userId, UUID memberId) {
        Workspace ws = findOrThrow(wsId);
        assertOrgMember(ws.getOrganizationId(), userId);
        WorkspaceMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> AppException.notFound("Member", memberId));
        memberRepository.delete(member);
    }

    // ── Helpers ─────────────────────────────────────────────
    private Workspace findOrThrow(UUID wsId) {
        return workspaceRepository.findByIdAndDeletedFalse(wsId)
                .orElseThrow(() -> AppException.notFound("Workspace", wsId));
    }

    private void assertOrgMember(UUID orgId, UUID userId) {
        if (!orgMemberRepository.existsByOrganizationIdAndUserId(orgId, userId)) {
            throw AppException.forbidden("You are not a member of this organization");
        }
    }

    private String generateSlug(UUID orgId, String name) {
        String normalized = Normalizer.normalize(name.toLowerCase().trim(), Normalizer.Form.NFD);
        String slug = Pattern.compile("[^a-z0-9\\s-]").matcher(normalized).replaceAll("")
                .trim().replaceAll("[\\s-]+", "-");
        String base = slug;
        int c = 1;
        while (workspaceRepository.existsByOrganizationIdAndSlugAndDeletedFalse(orgId, slug)) slug = base + "-" + c++;
        return slug;
    }

    private WorkspaceResponse mapToResponse(Workspace ws) {
        return WorkspaceResponse.builder()
                .id(ws.getId().toString()).organizationId(ws.getOrganizationId().toString())
                .name(ws.getName()).slug(ws.getSlug()).description(ws.getDescription())
                .color(ws.getColor()).icon(ws.getIcon()).createdAt(ws.getCreatedAt()).build();
    }
}
