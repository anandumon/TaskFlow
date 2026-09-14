package com.taskflow.calendar.repository;

import com.taskflow.calendar.entity.CalendarSyncPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalendarSyncPolicyRepository extends JpaRepository<CalendarSyncPolicy, UUID> {
    List<CalendarSyncPolicy> findByUserId(UUID userId);
    Optional<CalendarSyncPolicy> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<CalendarSyncPolicy> findFirstByUserIdAndWorkspaceIdOrderByCreatedAtDesc(UUID userId, UUID workspaceId);
}
