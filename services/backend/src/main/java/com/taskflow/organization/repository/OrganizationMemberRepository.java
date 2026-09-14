package com.taskflow.organization.repository;

import com.taskflow.organization.entity.OrganizationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {

    List<OrganizationMember> findByOrganizationId(UUID organizationId);

    Optional<OrganizationMember> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    Optional<OrganizationMember> findByOrganizationIdAndUserIdAndStatus(UUID organizationId, UUID userId, String status);

    boolean existsByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    boolean existsByOrganizationIdAndUserIdAndStatus(UUID organizationId, UUID userId, String status);

    long countByOrganizationId(UUID organizationId);

    @Query("SELECT om.organizationId FROM OrganizationMember om WHERE om.userId = :userId AND om.status = 'ACTIVE'")
    List<UUID> findOrganizationIdsByUserId(UUID userId);

    List<OrganizationMember> findByUserIdAndStatus(UUID userId, String status);
}
