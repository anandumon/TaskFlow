package com.taskflow.rbac.repository;

import com.taskflow.rbac.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {
    List<Role> findByOrganizationIdIsNullOrOrganizationId(UUID organizationId);
    List<Role> findByIsSystemTrue();
    java.util.Optional<Role> findByNameIgnoreCaseAndOrganizationIdIsNull(String name);
    java.util.Optional<Role> findByNameIgnoreCaseAndOrganizationId(String name, UUID organizationId);
}
