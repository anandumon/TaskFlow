package com.taskflow.calendar.repository;

import com.taskflow.calendar.entity.CalendarConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalendarConnectionRepository extends JpaRepository<CalendarConnection, UUID> {
    List<CalendarConnection> findByUserId(UUID userId);
    List<CalendarConnection> findByUserIdAndProvider(UUID userId, String provider);
    Optional<CalendarConnection> findFirstByUserIdAndProviderOrderByCreatedAtDesc(UUID userId, String provider);
    Optional<CalendarConnection> findFirstByUserIdAndProviderAndProviderAccountIdOrderByCreatedAtDesc(UUID userId, String provider, String providerAccountId);
    List<CalendarConnection> findByStatus(String status);

    @org.springframework.data.jpa.repository.Query("SELECT c FROM CalendarConnection c WHERE c.user.id = :userId AND UPPER(c.provider) = UPPER(:provider)")
    Optional<CalendarConnection> findByUserAndProvider(
        @org.springframework.data.repository.query.Param("userId") UUID userId,
        @org.springframework.data.repository.query.Param("provider") String provider
    );
}
