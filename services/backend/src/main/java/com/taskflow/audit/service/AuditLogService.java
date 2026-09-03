package com.taskflow.audit.service;

import com.taskflow.audit.entity.AuditLog;
import com.taskflow.audit.repository.AuditLogRepository;
import com.taskflow.common.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repository;

    @Async
    public void log(String action, String entityType, UUID entityId,
                    String beforeState, String afterState,
                    String ipAddress, String userAgent) {
        AuditLog entry = AuditLog.builder()
                .organizationId(TenantContext.getOrganizationId())
                .userId(TenantContext.getUserId())
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .beforeState(beforeState)
                .afterState(afterState)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();
        repository.save(entry);
        log.debug("Audit: {} {} {}", action, entityType, entityId);
    }

    public void log(String action, String entityType, UUID entityId) {
        log(action, entityType, entityId, null, null, null, null);
    }

    public Page<AuditLog> getByOrganization(UUID orgId, int page, int size) {
        return repository.findByOrganizationIdOrderByCreatedAtDesc(orgId, PageRequest.of(page, size));
    }

    public Page<AuditLog> getByEntity(String entityType, UUID entityId, int page, int size) {
        return repository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId, PageRequest.of(page, size));
    }
}
