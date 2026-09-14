package com.taskflow.calendar.repository;

import com.taskflow.calendar.entity.CalendarEventMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalendarEventMappingRepository extends JpaRepository<CalendarEventMapping, UUID> {
    List<CalendarEventMapping> findByTaskId(UUID taskId);
    List<CalendarEventMapping> findByProjectId(UUID projectId);
    Optional<CalendarEventMapping> findByCalendarConnectionIdAndExternalCalendarIdAndExternalEventId(
        UUID connectionId,
        String externalCalendarId,
        String externalEventId
    );
    Optional<CalendarEventMapping> findByTaskIdAndCalendarConnectionId(UUID taskId, UUID connectionId);
    Optional<CalendarEventMapping> findByProjectIdAndCalendarConnectionId(UUID projectId, UUID connectionId);
    void deleteByTaskId(UUID taskId);
    void deleteByProjectId(UUID projectId);
}
