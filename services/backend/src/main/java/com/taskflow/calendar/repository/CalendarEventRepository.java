package com.taskflow.calendar.repository;

import com.taskflow.calendar.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {
    List<CalendarEvent> findByUserId(UUID userId);
    Optional<CalendarEvent> findByCalendarIdAndExternalEventId(UUID calendarId, String externalEventId);

    @Query("SELECT e FROM CalendarEvent e WHERE e.user.id = :userId AND e.startAt >= :start AND e.endAt <= :end")
    List<CalendarEvent> findByUserIdAndDateRange(
        @Param("userId") UUID userId,
        @Param("start") Instant start,
        @Param("end") Instant end
    );
}
