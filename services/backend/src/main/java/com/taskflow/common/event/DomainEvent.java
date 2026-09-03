package com.taskflow.common.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public abstract class DomainEvent {
    private UUID eventId = UUID.randomUUID();
    private String eventType;
    private UUID userId;
    private UUID organizationId;
    private Instant occurredAt = Instant.now();

    protected DomainEvent(String eventType, UUID userId, UUID organizationId) {
        this.eventId = UUID.randomUUID();
        this.eventType = eventType;
        this.userId = userId;
        this.organizationId = organizationId;
        this.occurredAt = Instant.now();
    }
}
