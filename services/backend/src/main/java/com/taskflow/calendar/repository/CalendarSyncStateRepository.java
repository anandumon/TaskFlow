package com.taskflow.calendar.repository;

import com.taskflow.calendar.entity.CalendarSyncState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalendarSyncStateRepository extends JpaRepository<CalendarSyncState, UUID> {
    Optional<CalendarSyncState> findByCalendarConnectionIdAndExternalCalendarId(UUID connectionId, String externalCalendarId);
}
