package com.taskflow.rbac.repository;

import com.taskflow.rbac.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {

    List<RolePermission> findByRoleId(UUID roleId);

    void deleteByRoleId(UUID roleId);

    @Query(value = """
        SELECT DISTINCT p.code FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id IN (
            SELECT om.role_id FROM organization_members om WHERE om.user_id = :userId
            UNION
            SELECT wm.role_id FROM workspace_members wm WHERE wm.user_id = :userId
        )
    """, nativeQuery = true)
    Set<String> findPermissionCodesByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @Query(value = """
        SELECT DISTINCT p.code FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = :roleId
    """, nativeQuery = true)
    Set<String> findPermissionCodesByRoleId(@org.springframework.data.repository.query.Param("roleId") UUID roleId);
}
