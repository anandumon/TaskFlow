package com.taskflow.project.service;

import com.taskflow.common.exception.AppException;
import com.taskflow.identity.email.EmailService;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.organization.entity.Organization;
import com.taskflow.organization.entity.OrganizationMember;
import com.taskflow.organization.repository.OrganizationMemberRepository;
import com.taskflow.organization.repository.OrganizationRepository;
import com.taskflow.project.dto.AcceptInvitationResponse;
import com.taskflow.project.dto.CreateProjectInvitationRequest;
import com.taskflow.project.dto.ProjectInvitationResponse;
import com.taskflow.project.entity.Project;
import com.taskflow.project.entity.ProjectInvitation;
import com.taskflow.project.repository.ProjectInvitationRepository;
import com.taskflow.project.repository.ProjectRepository;
import com.taskflow.workspace.entity.Workspace;
import com.taskflow.workspace.entity.WorkspaceMember;
import com.taskflow.workspace.repository.WorkspaceMemberRepository;
import com.taskflow.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectInvitationService {

    private static final UUID MEMBER_ROLE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000004");

    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final ProjectInvitationRepository invitationRepository;
    private final OrganizationMemberRepository orgMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final EmailService emailService;

    @Value("${taskflow.app.url:http://localhost:3000}")
    private String appUrl;

    @Transactional
    public ProjectInvitationResponse createInvitation(UUID projectId, UUID inviterId, CreateProjectInvitationRequest request) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));

        Workspace workspace = workspaceRepository.findByIdAndDeletedFalse(project.getWorkspaceId())
                .orElseThrow(() -> AppException.notFound("Workspace", project.getWorkspaceId()));

        Organization organization = organizationRepository.findByIdAndDeletedFalse(workspace.getOrganizationId())
                .orElseThrow(() -> AppException.notFound("Organization", workspace.getOrganizationId()));

        User inviter = userRepository.findByIdAndDeletedFalse(inviterId)
                .orElseThrow(() -> AppException.notFound("User", inviterId));

        String normalizedEmail = request.getEmail().trim().toLowerCase();

        // Expire any existing pending invitations for this email on this project
        invitationRepository.findByProjectIdAndEmailIgnoreCaseAndStatus(projectId, normalizedEmail, "PENDING")
                .ifPresent(existing -> {
                    existing.setStatus("EXPIRED");
                    invitationRepository.save(existing);
                });

        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);

        ProjectInvitation invitation = ProjectInvitation.builder()
                .projectId(projectId)
                .workspaceId(workspace.getId())
                .organizationId(organization.getId())
                .email(normalizedEmail)
                .invitedBy(inviterId)
                .token(token)
                .status("PENDING")
                .role(request.getRole() != null ? request.getRole() : "MEMBER")
                .expiresAt(expiresAt)
                .build();

        ProjectInvitation saved = invitationRepository.save(invitation);

        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";
        String inviteUrl = baseUrl + "/invite?token=" + token;

        String inviterName = inviter.getFirstName() != null && !inviter.getFirstName().isBlank()
                ? (inviter.getFirstName() + (inviter.getLastName() != null ? " " + inviter.getLastName() : "")).trim()
                : inviter.getEmail();

        // Send Email dispatch via SmtpEmailService
        emailService.sendProjectInvitationEmail(
                normalizedEmail,
                inviterName,
                organization.getName(),
                workspace.getName(),
                project.getName(),
                inviteUrl
        );

        return toResponse(saved, project.getName(), workspace.getName(), organization.getName(), inviterName, inviteUrl);
    }

    @Transactional(readOnly = true)
    public ProjectInvitationResponse getInvitationByToken(String token) {
        ProjectInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> AppException.notFound("Invitation", token));

        if ("PENDING".equalsIgnoreCase(invitation.getStatus()) && invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus("EXPIRED");
        }

        Project project = projectRepository.findByIdAndDeletedFalse(invitation.getProjectId()).orElse(null);
        Workspace workspace = workspaceRepository.findByIdAndDeletedFalse(invitation.getWorkspaceId()).orElse(null);
        Organization organization = organizationRepository.findByIdAndDeletedFalse(invitation.getOrganizationId()).orElse(null);
        User inviter = userRepository.findByIdAndDeletedFalse(invitation.getInvitedBy()).orElse(null);

        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";
        String inviteUrl = baseUrl + "/invite?token=" + token;

        String inviterName = inviter != null && inviter.getFirstName() != null
                ? (inviter.getFirstName() + (inviter.getLastName() != null ? " " + inviter.getLastName() : "")).trim()
                : (inviter != null ? inviter.getEmail() : "A team member");

        return toResponse(
                invitation,
                project != null ? project.getName() : "Unknown Project",
                workspace != null ? workspace.getName() : "Unknown Workspace",
                organization != null ? organization.getName() : "Unknown Organization",
                inviterName,
                inviteUrl
        );
    }

    @Transactional
    public AcceptInvitationResponse acceptInvitation(String token, UUID userId) {
        ProjectInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> AppException.notFound("Invitation", token));

        if (!"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            throw AppException.badRequest("INVITATION_INVALID", "This invitation is no longer active (status: " + invitation.getStatus() + ").");
        }

        if (invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus("EXPIRED");
            invitationRepository.save(invitation);
            throw AppException.badRequest("INVITATION_EXPIRED", "This invitation has expired.");
        }

        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));

        Project project = projectRepository.findByIdAndDeletedFalse(invitation.getProjectId())
                .orElseThrow(() -> AppException.notFound("Project", invitation.getProjectId()));

        Workspace workspace = workspaceRepository.findByIdAndDeletedFalse(invitation.getWorkspaceId())
                .orElseThrow(() -> AppException.notFound("Workspace", invitation.getWorkspaceId()));

        Organization organization = organizationRepository.findByIdAndDeletedFalse(invitation.getOrganizationId())
                .orElseThrow(() -> AppException.notFound("Organization", invitation.getOrganizationId()));

        // 1. Ensure user is added to the Organization
        if (!orgMemberRepository.existsByOrganizationIdAndUserId(organization.getId(), userId)) {
            OrganizationMember orgMember = OrganizationMember.builder()
                    .organizationId(organization.getId())
                    .userId(userId)
                    .roleId(MEMBER_ROLE_ID)
                    .build();
            orgMemberRepository.save(orgMember);
            log.info("✔ User {} added to Organization {}", userId, organization.getId());
        }

        // 2. Ensure user is added to the Workspace
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), userId)) {
            WorkspaceMember wsMember = WorkspaceMember.builder()
                    .workspaceId(workspace.getId())
                    .userId(userId)
                    .roleId(MEMBER_ROLE_ID)
                    .build();
            workspaceMemberRepository.save(wsMember);
            log.info("✔ User {} added to Workspace {}", userId, workspace.getId());
        }

        // 3. Mark invitation accepted
        invitation.setStatus("ACCEPTED");
        invitationRepository.save(invitation);

        return AcceptInvitationResponse.builder()
                .organizationId(organization.getId())
                .workspaceId(workspace.getId())
                .projectId(project.getId())
                .organizationName(organization.getName())
                .workspaceName(workspace.getName())
                .projectName(project.getName())
                .message("Successfully joined " + project.getName() + " under " + organization.getName())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ProjectInvitationResponse> listInvitationsForProject(UUID projectId) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));

        Workspace workspace = workspaceRepository.findByIdAndDeletedFalse(project.getWorkspaceId()).orElse(null);
        Organization organization = workspace != null ? organizationRepository.findByIdAndDeletedFalse(workspace.getOrganizationId()).orElse(null) : null;

        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";

        return invitationRepository.findByProjectId(projectId).stream()
                .map(inv -> {
                    User inviter = userRepository.findByIdAndDeletedFalse(inv.getInvitedBy()).orElse(null);
                    String inviterName = inviter != null && inviter.getFirstName() != null
                            ? (inviter.getFirstName() + (inviter.getLastName() != null ? " " + inviter.getLastName() : "")).trim()
                            : (inviter != null ? inviter.getEmail() : "Team member");
                    String inviteUrl = baseUrl + "/invite?token=" + inv.getToken();
                    return toResponse(
                            inv,
                            project.getName(),
                            workspace != null ? workspace.getName() : "Workspace",
                            organization != null ? organization.getName() : "Organization",
                            inviterName,
                            inviteUrl
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProjectInvitationResponse> listInvitationsForOrganization(UUID orgId) {
        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";

        return invitationRepository.findByOrganizationId(orgId).stream()
                .map(inv -> {
                    Project project = projectRepository.findByIdAndDeletedFalse(inv.getProjectId()).orElse(null);
                    Workspace workspace = workspaceRepository.findByIdAndDeletedFalse(inv.getWorkspaceId()).orElse(null);
                    Organization organization = organizationRepository.findByIdAndDeletedFalse(inv.getOrganizationId()).orElse(null);
                    User inviter = userRepository.findByIdAndDeletedFalse(inv.getInvitedBy()).orElse(null);
                    String inviterName = inviter != null && inviter.getFirstName() != null
                            ? (inviter.getFirstName() + (inviter.getLastName() != null ? " " + inviter.getLastName() : "")).trim()
                            : (inviter != null ? inviter.getEmail() : "Team member");
                    String inviteUrl = baseUrl + "/invite?token=" + inv.getToken();
                    return toResponse(
                            inv,
                            project != null ? project.getName() : "Project",
                            workspace != null ? workspace.getName() : "Workspace",
                            organization != null ? organization.getName() : "Organization",
                            inviterName,
                            inviteUrl
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProjectInvitationResponse> listPendingInvitationsForUser(String email) {
        if (email == null || email.isBlank()) return List.of();
        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";

        return invitationRepository.findByEmailIgnoreCaseAndStatus(email.trim().toLowerCase(), "PENDING").stream()
                .filter(inv -> inv.getExpiresAt().isAfter(Instant.now()))
                .map(inv -> {
                    Project project = projectRepository.findByIdAndDeletedFalse(inv.getProjectId()).orElse(null);
                    Workspace workspace = workspaceRepository.findByIdAndDeletedFalse(inv.getWorkspaceId()).orElse(null);
                    Organization organization = organizationRepository.findByIdAndDeletedFalse(inv.getOrganizationId()).orElse(null);
                    User inviter = userRepository.findByIdAndDeletedFalse(inv.getInvitedBy()).orElse(null);
                    String inviterName = inviter != null && inviter.getFirstName() != null
                            ? (inviter.getFirstName() + (inviter.getLastName() != null ? " " + inviter.getLastName() : "")).trim()
                            : (inviter != null ? inviter.getEmail() : "Team member");
                    String inviteUrl = baseUrl + "/invite?token=" + inv.getToken();
                    return toResponse(
                            inv,
                            project != null ? project.getName() : "Project",
                            workspace != null ? workspace.getName() : "Workspace",
                            organization != null ? organization.getName() : "Organization",
                            inviterName,
                            inviteUrl
                    );
                })
                .toList();
    }

    @Transactional
    public void declineInvitation(String token, UUID userId) {
        ProjectInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> AppException.notFound("Invitation", token));
        invitation.setStatus("DECLINED");
        invitationRepository.save(invitation);
    }

    private ProjectInvitationResponse toResponse(ProjectInvitation inv, String projectName, String workspaceName, String orgName, String inviterName, String inviteUrl) {
        return ProjectInvitationResponse.builder()
                .id(inv.getId())
                .projectId(inv.getProjectId())
                .workspaceId(inv.getWorkspaceId())
                .organizationId(inv.getOrganizationId())
                .email(inv.getEmail())
                .projectName(projectName)
                .workspaceName(workspaceName)
                .orgName(orgName)
                .inviterName(inviterName)
                .status(inv.getStatus())
                .role(inv.getRole())
                .token(inv.getToken())
                .inviteUrl(inviteUrl)
                .expiresAt(inv.getExpiresAt())
                .createdAt(inv.getCreatedAt())
                .build();
    }
}
