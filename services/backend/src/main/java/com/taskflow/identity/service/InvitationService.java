package com.taskflow.identity.service;

import com.taskflow.audit.service.AuditLogService;
import com.taskflow.common.exception.AppException;
import com.taskflow.identity.dto.CreateInvitationRequest;
import com.taskflow.identity.dto.InvitationResponse;
import com.taskflow.identity.email.EmailService;
import com.taskflow.identity.entity.Invitation;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.InvitationRepository;
import com.taskflow.identity.repository.UserRepository;
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
import com.taskflow.rbac.service.AuthorizationService;
import com.taskflow.workspace.entity.Workspace;
import com.taskflow.workspace.entity.WorkspaceMember;
import com.taskflow.workspace.repository.WorkspaceMemberRepository;
import com.taskflow.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final AuthorizationService authorizationService;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final RoleRepository roleRepository;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    public static String hashToken(String rawToken) {
        if (rawToken == null) return "";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Transactional
    public InvitationResponse createInvitation(UUID inviterUserId, CreateInvitationRequest request) {
        String scope = request.getScope().trim().toUpperCase();
        UUID targetResourceId = null;

        if ("ORGANIZATION".equals(scope)) {
            targetResourceId = request.getOrganizationId();
        } else if ("WORKSPACE".equals(scope)) {
            targetResourceId = request.getWorkspaceId();
        } else if ("PROJECT".equals(scope)) {
            targetResourceId = request.getProjectId();
        } else {
            throw AppException.badRequest("INVALID_SCOPE", "Invalid scope: " + scope);
        }

        if (targetResourceId == null) {
            throw AppException.badRequest("INVALID_TARGET", "Target resource ID is required for scope " + scope);
        }

        UUID roleId = request.getRoleId();
        if (roleId == null) {
            if ("PROJECT".equals(scope)) {
                roleId = resolveProjectRoleId(request.getRoleName());
            } else if ("WORKSPACE".equals(scope)) {
                roleId = resolveWorkspaceRoleId(request.getRoleName());
            } else {
                roleId = resolveOrganizationRoleId(request.getRoleName());
            }
        }

        // 2. Authorization check: can user invite at this scope?
        if (!authorizationService.canInvite(inviterUserId, scope, targetResourceId, roleId)) {
            throw AppException.forbidden("You are not authorized to invite users with this role at this scope");
        }

        // 3. Resolve parent hierarchy
        UUID orgId = request.getOrganizationId();
        UUID wsId = request.getWorkspaceId();
        UUID projId = request.getProjectId();

        if ("PROJECT".equals(scope)) {
            Project project = projectRepository.findByIdAndDeletedFalse(projId)
                    .orElseThrow(() -> AppException.notFound("Project not found"));
            wsId = project.getWorkspaceId();
            Workspace ws = workspaceRepository.findByIdAndDeletedFalse(wsId)
                    .orElseThrow(() -> AppException.notFound("Workspace not found"));
            orgId = ws.getOrganizationId();
        } else if ("WORKSPACE".equals(scope)) {
            Workspace ws = workspaceRepository.findByIdAndDeletedFalse(wsId)
                    .orElseThrow(() -> AppException.notFound("Workspace not found"));
            orgId = ws.getOrganizationId();
        }

        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);
        String cleanEmail = request.getEmail().trim().toLowerCase();

        // Expire any existing pending invitations for same email & target
        List<Invitation> existingPending = invitationRepository.findByEmailIgnoreCaseAndStatus(cleanEmail, "PENDING");
        for (Invitation inv : existingPending) {
            if (Objects.equals(inv.getScope(), scope) &&
                Objects.equals(inv.getProjectId(), projId) &&
                Objects.equals(inv.getWorkspaceId(), wsId) &&
                Objects.equals(inv.getOrganizationId(), orgId)) {
                inv.setStatus("REVOKED");
                invitationRepository.save(inv);
            }
        }

        Invitation invitation = Invitation.builder()
                .email(cleanEmail)
                .scope(scope)
                .organizationId(orgId)
                .workspaceId(wsId)
                .projectId(projId)
                .roleId(roleId)
                .invitedBy(inviterUserId)
                .status("PENDING")
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();

        invitation = invitationRepository.save(invitation);

        // Audit log
        auditLogService.logAction(orgId, inviterUserId, "MEMBER_INVITED", scope, targetResourceId, null,
                Map.of("email", cleanEmail, "scope", scope, "roleId", roleId.toString()));

        // Format invitation URL
        String inviteUrl = String.format("%s/invite?token=%s&id=%s", appUrl, rawToken, invitation.getId());

        // Send Email
        try {
            User inviter = userRepository.findById(inviterUserId).orElse(null);
            String inviterName = inviter != null ? (inviter.getDisplayName() != null ? inviter.getDisplayName() : inviter.getEmail()) : "A team member";
            String orgName = orgId != null ? organizationRepository.findById(orgId).map(Organization::getName).orElse("TaskFlow") : "TaskFlow";
            String wsName = wsId != null ? workspaceRepository.findById(wsId).map(Workspace::getName).orElse("Workspace") : "Workspace";
            String projName = projId != null ? projectRepository.findById(projId).map(Project::getName).orElse("Project") : "Project";

            emailService.sendProjectInvitationEmail(cleanEmail, inviterName, orgName, wsName, projName, inviteUrl);
        } catch (Exception e) {
            log.error("Failed to send invitation email to {}: {}", cleanEmail, e.getMessage());
        }

        return mapToResponse(invitation, inviteUrl, rawToken);
    }

    @Transactional
    public InvitationResponse acceptInvitation(UUID authenticatedUserId, String rawToken, UUID invitationId) {
        User user = userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> AppException.unauthorized("Authenticated user not found"));

        Invitation invitation = null;
        if (rawToken != null && !rawToken.isBlank()) {
            String tokenHash = hashToken(rawToken.trim());
            invitation = invitationRepository.findByTokenHash(tokenHash).orElse(null);
        }
        if (invitation == null && invitationId != null) {
            invitation = invitationRepository.findById(invitationId).orElse(null);
        }
        if (invitation == null && rawToken != null && !rawToken.isBlank()) {
            try {
                UUID parsedId = UUID.fromString(rawToken.trim());
                invitation = invitationRepository.findById(parsedId).orElse(null);
            } catch (IllegalArgumentException ignored) {}
        }
        if (invitation == null) {
            throw AppException.notFound("Invitation not found or invalid token");
        }

        // Validations
        if (!"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            throw AppException.badRequest("INVITATION_NOT_PENDING", "Invitation is no longer pending (status: " + invitation.getStatus() + ")");
        }
        if (invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus("EXPIRED");
            invitationRepository.save(invitation);
            throw AppException.badRequest("INVITATION_EXPIRED", "Invitation has expired");
        }
        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw AppException.forbidden("This invitation was issued for " + invitation.getEmail() + ", not " + user.getEmail());
        }

        // Apply memberships according to scope
        String scope = invitation.getScope().toUpperCase();
        UUID orgId = invitation.getOrganizationId();
        UUID wsId = invitation.getWorkspaceId();
        UUID projId = invitation.getProjectId();
        UUID roleId = invitation.getRoleId();

        // 1. Ensure Organization Membership
        if (orgId != null) {
            Optional<OrganizationMember> omOpt = organizationMemberRepository.findByOrganizationIdAndUserId(orgId, authenticatedUserId);
            if (omOpt.isPresent()) {
                OrganizationMember om = omOpt.get();
                om.setStatus("ACTIVE");
                if ("ORGANIZATION".equals(scope) && roleId != null) {
                    om.setRoleId(roleId);
                }
                organizationMemberRepository.save(om);
            } else {
                UUID orgRoleId = "ORGANIZATION".equals(scope) ? roleId : resolveOrganizationRoleId(null);
                organizationMemberRepository.save(OrganizationMember.builder()
                        .organizationId(orgId)
                        .userId(authenticatedUserId)
                        .roleId(orgRoleId)
                        .status("ACTIVE")
                        .build());
            }
        }

        // 2. Ensure Workspace Membership
        if (wsId != null) {
            Optional<WorkspaceMember> wmOpt = workspaceMemberRepository.findByWorkspaceIdAndUserId(wsId, authenticatedUserId);
            if (wmOpt.isPresent()) {
                WorkspaceMember wm = wmOpt.get();
                wm.setStatus("ACTIVE");
                if ("WORKSPACE".equals(scope) && roleId != null) {
                    wm.setRoleId(roleId);
                }
                workspaceMemberRepository.save(wm);
            } else {
                UUID wsRoleId = "WORKSPACE".equals(scope) ? roleId : resolveWorkspaceRoleId(null);
                workspaceMemberRepository.save(WorkspaceMember.builder()
                        .workspaceId(wsId)
                        .userId(authenticatedUserId)
                        .roleId(wsRoleId)
                        .status("ACTIVE")
                        .build());
            }
        }

        // 3. Ensure Project Membership
        if ("PROJECT".equals(scope) && projId != null) {
            Optional<ProjectMember> pmOpt = projectMemberRepository.findByProjectIdAndUserId(projId, authenticatedUserId);
            if (pmOpt.isPresent()) {
                ProjectMember pm = pmOpt.get();
                pm.setStatus("ACTIVE");
                if (roleId != null) pm.setRoleId(roleId);
                projectMemberRepository.save(pm);
            } else {
                UUID projRoleId = roleId != null ? roleId : resolveProjectRoleId(null);
                projectMemberRepository.save(ProjectMember.builder()
                        .projectId(projId)
                        .userId(authenticatedUserId)
                        .roleId(projRoleId)
                        .status("ACTIVE")
                        .build());
            }
        }

        // Mark accepted
        invitation.setStatus("ACCEPTED");
        invitation.setAcceptedAt(Instant.now());
        invitation.setInvitedUserId(authenticatedUserId);
        invitation = invitationRepository.save(invitation);

        // Audit log
        auditLogService.logAction(orgId, authenticatedUserId, "INVITATION_ACCEPTED", scope,
                "PROJECT".equals(scope) ? projId : ("WORKSPACE".equals(scope) ? wsId : orgId),
                null, Map.of("invitationId", invitation.getId().toString(), "scope", scope));

        return mapToResponse(invitation, null);
    }

    @Transactional
    public void declineInvitation(UUID authenticatedUserId, UUID invitationId) {
        User user = userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> AppException.unauthorized("User not found"));

        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> AppException.notFound("Invitation not found"));

        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw AppException.forbidden("This invitation was not sent to you");
        }

        invitation.setStatus("DECLINED");
        invitationRepository.save(invitation);

        auditLogService.logAction(invitation.getOrganizationId(), authenticatedUserId, "INVITATION_DECLINED",
                invitation.getScope(), invitation.getId(), null, Map.of("invitationId", invitation.getId().toString()));
    }

    @Transactional
    public void revokeInvitation(UUID actorUserId, UUID invitationId) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> AppException.notFound("Invitation not found"));

        UUID targetId = "PROJECT".equals(invitation.getScope()) ? invitation.getProjectId() :
                ("WORKSPACE".equals(invitation.getScope()) ? invitation.getWorkspaceId() : invitation.getOrganizationId());

        if (!authorizationService.canInvite(actorUserId, invitation.getScope(), targetId, null)) {
            throw AppException.forbidden("You are not authorized to revoke this invitation");
        }

        invitation.setStatus("REVOKED");
        invitationRepository.save(invitation);

        auditLogService.logAction(invitation.getOrganizationId(), actorUserId, "INVITATION_REVOKED",
                invitation.getScope(), invitation.getId(), null, Map.of("invitationId", invitation.getId().toString()));
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> getPendingInvitationsForUser(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) return List.of();
        List<Invitation> list = invitationRepository.findByEmailIgnoreCaseAndStatus(userEmail.trim().toLowerCase(), "PENDING");
        return list.stream().map(i -> mapToResponse(i, null)).toList();
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> getInvitationsForResource(String scope, UUID resourceId) {
        List<Invitation> list;
        if ("PROJECT".equalsIgnoreCase(scope)) {
            list = invitationRepository.findByProjectIdAndStatus(resourceId, "PENDING");
        } else if ("WORKSPACE".equalsIgnoreCase(scope)) {
            list = invitationRepository.findByWorkspaceIdAndStatus(resourceId, "PENDING");
        } else {
            list = invitationRepository.findByOrganizationIdAndStatus(resourceId, "PENDING");
        }
        return list.stream().map(i -> mapToResponse(i, null)).toList();
    }

    @Transactional(readOnly = true)
    public InvitationResponse getInvitationByToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw AppException.notFound("Invitation token not provided");
        }
        String tokenHash = hashToken(rawToken.trim());
        Invitation inv = invitationRepository.findByTokenHash(tokenHash).orElse(null);
        if (inv == null) {
            try {
                UUID parsedId = UUID.fromString(rawToken.trim());
                inv = invitationRepository.findById(parsedId).orElse(null);
            } catch (IllegalArgumentException ignored) {}
        }
        if (inv == null) {
            throw AppException.notFound("Invitation not found for token");
        }
        return mapToResponse(inv, null);
    }

    @Transactional
    public void declineInvitationByToken(UUID authenticatedUserId, String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw AppException.notFound("Invitation token not provided");
        }
        String tokenHash = hashToken(rawToken.trim());
        Invitation inv = invitationRepository.findByTokenHash(tokenHash).orElse(null);
        if (inv == null) {
            try {
                UUID parsedId = UUID.fromString(rawToken.trim());
                inv = invitationRepository.findById(parsedId).orElse(null);
            } catch (IllegalArgumentException ignored) {}
        }
        if (inv == null) {
            throw AppException.notFound("Invitation not found for token");
        }
        declineInvitation(authenticatedUserId, inv.getId());
    }

    public UUID resolveProjectRoleId(String roleName) {
        String name = (roleName != null && !roleName.isBlank()) ? roleName.trim() : "Project Editor";
        if ("Admin".equalsIgnoreCase(name) || "Project Admin".equalsIgnoreCase(name)) {
            return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Project Admin")
                    .map(Role::getId)
                    .orElse(UUID.fromString("c0000000-0000-0000-0000-000000000001"));
        }
        if ("Commenter".equalsIgnoreCase(name) || "Project Commenter".equalsIgnoreCase(name)) {
            return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Project Commenter")
                    .map(Role::getId)
                    .orElse(UUID.fromString("c0000000-0000-0000-0000-000000000003"));
        }
        if ("Viewer".equalsIgnoreCase(name) || "Project Viewer".equalsIgnoreCase(name) || "Guest".equalsIgnoreCase(name) || "Project Guest".equalsIgnoreCase(name)) {
            return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Project Viewer")
                    .map(Role::getId)
                    .orElse(UUID.fromString("c0000000-0000-0000-0000-000000000004"));
        }
        return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Project Editor")
                .map(Role::getId)
                .orElse(UUID.fromString("c0000000-0000-0000-0000-000000000002"));
    }

    public UUID resolveWorkspaceRoleId(String roleName) {
        String name = (roleName != null && !roleName.isBlank()) ? roleName.trim() : "Workspace Member";
        if ("Admin".equalsIgnoreCase(name) || "Workspace Admin".equalsIgnoreCase(name)) {
            return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Workspace Admin")
                    .map(Role::getId)
                    .orElse(UUID.fromString("b0000000-0000-0000-0000-000000000001"));
        }
        if ("Viewer".equalsIgnoreCase(name) || "Workspace Viewer".equalsIgnoreCase(name)) {
            return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Workspace Viewer")
                    .map(Role::getId)
                    .orElse(UUID.fromString("b0000000-0000-0000-0000-000000000003"));
        }
        return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Workspace Member")
                .map(Role::getId)
                .orElse(UUID.fromString("b0000000-0000-0000-0000-000000000002"));
    }

    public UUID resolveOrganizationRoleId(String roleName) {
        String name = (roleName != null && !roleName.isBlank()) ? roleName.trim() : "Member";
        if ("Admin".equalsIgnoreCase(name) || "Organization Admin".equalsIgnoreCase(name)) {
            return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Admin")
                    .map(Role::getId)
                    .orElse(UUID.fromString("a0000000-0000-0000-0000-000000000002"));
        }
        return roleRepository.findByNameIgnoreCaseAndOrganizationIdIsNull("Member")
                .map(Role::getId)
                .orElse(UUID.fromString("a0000000-0000-0000-0000-000000000004"));
    }

    private InvitationResponse mapToResponse(Invitation inv, String invitationUrl) {
        return mapToResponse(inv, invitationUrl, null);
    }

    private InvitationResponse mapToResponse(Invitation inv, String invitationUrl, String rawToken) {
        String orgName = inv.getOrganizationId() != null ? organizationRepository.findById(inv.getOrganizationId()).map(Organization::getName).orElse(null) : null;
        String wsName = inv.getWorkspaceId() != null ? workspaceRepository.findById(inv.getWorkspaceId()).map(Workspace::getName).orElse(null) : null;
        String projName = inv.getProjectId() != null ? projectRepository.findById(inv.getProjectId()).map(Project::getName).orElse(null) : null;
        String roleName = inv.getRoleId() != null ? roleRepository.findById(inv.getRoleId()).map(Role::getName).orElse(null) : null;

        String effectiveToken = (rawToken != null && !rawToken.isBlank())
                ? rawToken
                : (inv.getId() != null ? inv.getId().toString() : null);

        return InvitationResponse.builder()
                .id(inv.getId())
                .email(inv.getEmail())
                .scope(inv.getScope())
                .organizationId(inv.getOrganizationId())
                .organizationName(orgName)
                .workspaceId(inv.getWorkspaceId())
                .workspaceName(wsName)
                .projectId(inv.getProjectId())
                .projectName(projName)
                .roleId(inv.getRoleId())
                .roleName(roleName)
                .status(inv.getStatus())
                .expiresAt(inv.getExpiresAt())
                .acceptedAt(inv.getAcceptedAt())
                .createdAt(inv.getCreatedAt())
                .invitationUrl(invitationUrl)
                .token(effectiveToken)
                .build();
    }
}
