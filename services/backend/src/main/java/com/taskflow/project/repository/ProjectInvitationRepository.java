package com.taskflow.project.repository;

import com.taskflow.project.entity.ProjectInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectInvitationRepository extends JpaRepository<ProjectInvitation, UUID> {
    Optional<ProjectInvitation> findByToken(String token);
    List<ProjectInvitation> findByProjectId(UUID projectId);
    List<ProjectInvitation> findByOrganizationId(UUID organizationId);
    List<ProjectInvitation> findByEmailIgnoreCase(String email);
    List<ProjectInvitation> findByEmailIgnoreCaseAndStatus(String email, String status);
    Optional<ProjectInvitation> findByProjectIdAndEmailIgnoreCaseAndStatus(UUID projectId, String email, String status);
}
