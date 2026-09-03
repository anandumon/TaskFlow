package com.taskflow.common.tenant;

import lombok.extern.slf4j.Slf4j;

import java.util.UUID;

/**
 * Thread-local storage for tenant context.
 * Set by TenantFilter on every request, used by repositories to scope queries.
 */
@Slf4j
public final class TenantContext {

    private TenantContext() {}

    private static final ThreadLocal<UUID> CURRENT_ORG = new ThreadLocal<>();
    private static final ThreadLocal<UUID> CURRENT_USER = new ThreadLocal<>();

    public static void setOrganizationId(UUID orgId) {
        CURRENT_ORG.set(orgId);
    }

    public static UUID getOrganizationId() {
        return CURRENT_ORG.get();
    }

    public static UUID requireOrganizationId() {
        UUID orgId = CURRENT_ORG.get();
        if (orgId == null) {
            throw new IllegalStateException("Organization context not set");
        }
        return orgId;
    }

    public static void setUserId(UUID userId) {
        CURRENT_USER.set(userId);
    }

    public static UUID getUserId() {
        return CURRENT_USER.get();
    }

    public static UUID requireUserId() {
        UUID userId = CURRENT_USER.get();
        if (userId == null) {
            throw new IllegalStateException("User context not set");
        }
        return userId;
    }

    public static void clear() {
        CURRENT_ORG.remove();
        CURRENT_USER.remove();
    }
}
