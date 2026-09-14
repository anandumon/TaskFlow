package com.taskflow.calendar.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "external_calendar", uniqueConstraints = {
    @UniqueConstraint(name = "uq_external_calendar_conn_ext_id", columnNames = {"connection_id", "external_calendar_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connection_id", nullable = false)
    private CalendarConnection connection;

    @Column(name = "external_calendar_id", nullable = false)
    private String externalCalendarId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "timezone", length = 100)
    private String timezone;

    @Column(name = "is_primary")
    private Boolean isPrimary;

    @Column(name = "sync_enabled")
    private Boolean syncEnabled;

    @Builder.Default
    @Column(name = "can_read")
    private Boolean canRead = true;

    @Builder.Default
    @Column(name = "can_write")
    private Boolean canWrite = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
