package com.taskflow.workspace.repository;

import com.taskflow.workspace.entity.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, UUID> {
    List<WorkspaceMember> findByWorkspaceId(UUID workspaceId);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserIdAndStatus(UUID workspaceId, UUID userId, String status);
    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
    boolean existsByWorkspaceIdAndUserIdAndStatus(UUID workspaceId, UUID userId, String status);
    List<WorkspaceMember> findByUserId(UUID userId);
    List<WorkspaceMember> findByUserIdAndStatus(UUID userId, String status);
    void deleteByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
}
