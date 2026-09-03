package com.taskflow.audit.repository;

import com.taskflow.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    Page<AuditLog> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, Pageable pageable);
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    Page<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId, Pageable pageable);
}
