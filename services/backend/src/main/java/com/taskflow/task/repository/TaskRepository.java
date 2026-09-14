package com.taskflow.task.repository;

import com.taskflow.task.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(UUID workspaceId);
    List<Task> findByProjectIdAndDeletedFalseOrderByCreatedAtDesc(UUID projectId);
    Optional<Task> findByIdAndDeletedFalse(UUID id);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM Task t WHERE t.deleted = FALSE AND LOWER(t.status) != 'done' AND t.dueDate IS NOT NULL AND t.dueDate != ''")
    List<Task> findActiveTasksWithDueDate();
}
