package com.taskflow.identity.repository;

import com.taskflow.identity.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    Optional<Invitation> findByTokenHash(String tokenHash);

    List<Invitation> findByEmailIgnoreCaseAndStatus(String email, String status);

    List<Invitation> findByEmailIgnoreCase(String email);

    List<Invitation> findByOrganizationIdAndStatus(UUID organizationId, String status);

    List<Invitation> findByWorkspaceIdAndStatus(UUID workspaceId, String status);

    List<Invitation> findByProjectIdAndStatus(UUID projectId, String status);

    List<Invitation> findByInvitedBy(UUID invitedBy);
}
