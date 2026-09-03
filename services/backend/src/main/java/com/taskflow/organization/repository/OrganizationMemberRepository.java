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

    boolean existsByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    long countByOrganizationId(UUID organizationId);

    @Query("SELECT om.organizationId FROM OrganizationMember om WHERE om.userId = :userId")
    List<UUID> findOrganizationIdsByUserId(UUID userId);
}
