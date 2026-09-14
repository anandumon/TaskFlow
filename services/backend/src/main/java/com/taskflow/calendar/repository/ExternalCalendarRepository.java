package com.taskflow.calendar.repository;

import com.taskflow.calendar.entity.ExternalCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExternalCalendarRepository extends JpaRepository<ExternalCalendar, UUID> {
    List<ExternalCalendar> findByConnectionId(UUID connectionId);
    Optional<ExternalCalendar> findByConnectionIdAndExternalCalendarId(UUID connectionId, String externalCalendarId);
    Optional<ExternalCalendar> findByConnectionIdAndIsPrimaryTrue(UUID connectionId);
}
