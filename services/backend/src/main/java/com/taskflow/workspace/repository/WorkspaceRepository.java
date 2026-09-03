package com.taskflow.workspace.repository;

import com.taskflow.workspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {
    List<Workspace> findByOrganizationIdAndDeletedFalse(UUID organizationId);
    Optional<Workspace> findByIdAndDeletedFalse(UUID id);
    boolean existsByIdAndDeletedFalse(UUID id);
    boolean existsByOrganizationIdAndSlugAndDeletedFalse(UUID organizationId, String slug);
}
