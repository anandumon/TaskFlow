package com.taskflow.calendar.repository;

import com.taskflow.calendar.entity.CalendarWebhookSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalendarWebhookSubscriptionRepository extends JpaRepository<CalendarWebhookSubscription, UUID> {
    Optional<CalendarWebhookSubscription> findByCalendarConnectionIdAndSubscriptionId(UUID connectionId, String subscriptionId);
    Optional<CalendarWebhookSubscription> findBySubscriptionId(String subscriptionId);
    List<CalendarWebhookSubscription> findByExpirationAtBefore(Instant expirationAt);
}
