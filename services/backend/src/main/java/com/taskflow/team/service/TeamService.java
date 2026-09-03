package com.taskflow.team.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.organization.repository.OrganizationMemberRepository;
import com.taskflow.team.dto.*;
import com.taskflow.team.entity.Team;
import com.taskflow.team.entity.TeamMember;
import com.taskflow.team.repository.TeamMemberRepository;
import com.taskflow.team.repository.TeamRepository;
import com.taskflow.workspace.entity.Workspace;
import com.taskflow.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final OrganizationMemberRepository orgMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public TeamResponse create(UUID wsId, UUID userId, CreateTeamRequest request) {
        Workspace ws = workspaceRepository.findByIdAndDeletedFalse(wsId)
                .orElseThrow(() -> AppException.notFound("Workspace", wsId));
        assertOrgMember(ws.getOrganizationId(), userId);

        Team team = Team.builder()
                .workspaceId(wsId).name(request.getName().trim())
                .description(request.getDescription())
                .color(request.getColor() != null ? request.getColor() : "#8B5CF6")
                .icon(request.getIcon() != null ? request.getIcon() : "users")
                .createdBy(userId).build();
        team = teamRepository.save(team);

        // Add creator as team lead
        TeamMember leader = TeamMember.builder()
                .teamId(team.getId()).userId(userId).role("LEAD").build();
        memberRepository.save(leader);

        return mapToResponse(team);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> listByWorkspace(UUID wsId, UUID userId) {
        Workspace ws = workspaceRepository.findByIdAndDeletedFalse(wsId)
                .orElseThrow(() -> AppException.notFound("Workspace", wsId));
        assertOrgMember(ws.getOrganizationId(), userId);
        return teamRepository.findByWorkspaceIdAndDeletedFalse(wsId)
                .stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public TeamResponse update(UUID teamId, UUID userId, UpdateTeamRequest request) {
        Team team = teamRepository.findByIdAndDeletedFalse(teamId)
                .orElseThrow(() -> AppException.notFound("Team", teamId));
        Workspace ws = workspaceRepository.findByIdAndDeletedFalse(team.getWorkspaceId())
                .orElseThrow(() -> AppException.notFound("Workspace", team.getWorkspaceId()));
        assertOrgMember(ws.getOrganizationId(), userId);

        if (request.getName() != null) team.setName(request.getName().trim());
        if (request.getDescription() != null) team.setDescription(request.getDescription());
        if (request.getColor() != null) team.setColor(request.getColor());
        if (request.getIcon() != null) team.setIcon(request.getIcon());

        return mapToResponse(teamRepository.save(team));
    }

    @Transactional
    public void delete(UUID teamId, UUID userId) {
        Team team = teamRepository.findByIdAndDeletedFalse(teamId)
                .orElseThrow(() -> AppException.notFound("Team", teamId));
        Workspace ws = workspaceRepository.findByIdAndDeletedFalse(team.getWorkspaceId())
                .orElseThrow(() -> AppException.notFound("Workspace", team.getWorkspaceId()));
        assertOrgMember(ws.getOrganizationId(), userId);
        team.softDelete();
        teamRepository.save(team);
    }

    @Transactional
    public void addMember(UUID teamId, UUID userId, UUID targetUserId) {
        Team team = teamRepository.findByIdAndDeletedFalse(teamId)
                .orElseThrow(() -> AppException.notFound("Team", teamId));
        if (memberRepository.existsByTeamIdAndUserId(teamId, targetUserId)) {
            throw AppException.conflict("MEMBER_EXISTS", "User is already a team member");
        }
        memberRepository.save(TeamMember.builder()
                .teamId(teamId).userId(targetUserId).role("MEMBER").build());
    }

    @Transactional
    public void removeMember(UUID teamId, UUID userId, UUID targetUserId) {
        memberRepository.deleteByTeamIdAndUserId(teamId, targetUserId);
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listMembers(UUID teamId) {
        return memberRepository.findByTeamId(teamId).stream().map(m -> {
            User user = userRepository.findByIdAndDeletedFalse(m.getUserId()).orElse(null);
            return TeamMemberResponse.builder()
                    .id(m.getId().toString()).userId(m.getUserId().toString())
                    .displayName(user != null ? user.getDisplayName() : null)
                    .email(user != null ? user.getEmail() : null)
                    .avatarUrl(user != null ? user.getAvatarUrl() : null)
                    .role(m.getRole()).joinedAt(m.getJoinedAt()).build();
        }).toList();
    }

    private void assertOrgMember(UUID orgId, UUID userId) {
        if (!orgMemberRepository.existsByOrganizationIdAndUserId(orgId, userId))
            throw AppException.forbidden("Not a member of this organization");
    }

    private TeamResponse mapToResponse(Team t) {
        long memberCount = memberRepository.findByTeamId(t.getId()).size();
        return TeamResponse.builder()
                .id(t.getId().toString()).workspaceId(t.getWorkspaceId().toString())
                .name(t.getName()).description(t.getDescription())
                .color(t.getColor()).icon(t.getIcon())
                .memberCount(memberCount).createdAt(t.getCreatedAt()).build();
    }
}
