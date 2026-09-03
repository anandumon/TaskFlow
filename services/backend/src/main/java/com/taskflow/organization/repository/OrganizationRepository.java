package com.taskflow.organization.repository;

import com.taskflow.organization.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    Optional<Organization> findByIdAndDeletedFalse(UUID id);

    Optional<Organization> findBySlugAndDeletedFalse(String slug);

    boolean existsBySlugAndDeletedFalse(String slug);

    @Query("SELECT o FROM Organization o JOIN OrganizationMember om ON o.id = om.organizationId " +
           "WHERE om.userId = :userId AND o.deleted = false ORDER BY o.name")
    List<Organization> findAllByMemberUserId(UUID userId);
}
