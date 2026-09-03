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

    @Query("""
        SELECT DISTINCT p.code FROM Permission p
        JOIN RolePermission rp ON rp.permissionId = p.id
        WHERE rp.roleId IN (
            SELECT om.roleId FROM OrganizationMember om WHERE om.userId = :userId
            UNION
            SELECT wm.roleId FROM WorkspaceMember wm WHERE wm.userId = :userId
        )
    """)
    Set<String> findPermissionCodesByUserId(UUID userId);

    @Query("""
        SELECT DISTINCT p.code FROM Permission p
        JOIN RolePermission rp ON rp.permissionId = p.id
        WHERE rp.roleId = :roleId
    """)
    Set<String> findPermissionCodesByRoleId(UUID roleId);
}
