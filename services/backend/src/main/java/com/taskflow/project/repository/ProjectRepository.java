package com.taskflow.project.repository;

import com.taskflow.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(UUID workspaceId);
    Optional<Project> findByIdAndDeletedFalse(UUID id);
    Optional<Project> findByWorkspaceIdAndSlugAndDeletedFalse(UUID workspaceId, String slug);
    boolean existsByWorkspaceIdAndSlugAndDeletedFalse(UUID workspaceId, String slug);
}
