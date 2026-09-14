package com.taskflow.project.repository;

import com.taskflow.project.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {

    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);

    Optional<ProjectMember> findByProjectIdAndUserIdAndStatus(UUID projectId, UUID userId, String status);

    List<ProjectMember> findByProjectIdAndStatus(UUID projectId, String status);

    List<ProjectMember> findByProjectId(UUID projectId);

    List<ProjectMember> findByUserIdAndStatus(UUID userId, String status);

    List<ProjectMember> findByUserId(UUID userId);

    boolean existsByProjectIdAndUserIdAndStatus(UUID projectId, UUID userId, String status);

    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);

    void deleteByProjectIdAndUserId(UUID projectId, UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(pm) > 0 THEN true ELSE false END FROM ProjectMember pm JOIN Project p ON pm.projectId = p.id WHERE pm.userId = :userId AND pm.status = :status AND p.workspaceId = :workspaceId AND p.deleted = false")
    boolean existsByUserIdAndStatusAndWorkspaceId(@org.springframework.data.repository.query.Param("userId") UUID userId,
                                                  @org.springframework.data.repository.query.Param("status") String status,
                                                  @org.springframework.data.repository.query.Param("workspaceId") UUID workspaceId);
}
