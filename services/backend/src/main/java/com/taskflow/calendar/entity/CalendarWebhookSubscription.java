package com.taskflow.calendar.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "calendar_webhook_subscription", uniqueConstraints = {
    @UniqueConstraint(name = "uq_webhook_sub_conn_id", columnNames = {"calendar_connection_id", "subscription_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarWebhookSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calendar_connection_id", nullable = false)
    private CalendarConnection calendarConnection;

    @Column(name = "subscription_id", nullable = false)
    private String subscriptionId;

    @Column(name = "resource_id")
    private String resourceId;

    @Column(name = "resource")
    private String resource;

    @Column(name = "client_state")
    private String clientState;

    @Column(name = "expiration_at", nullable = false)
    private Instant expirationAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
