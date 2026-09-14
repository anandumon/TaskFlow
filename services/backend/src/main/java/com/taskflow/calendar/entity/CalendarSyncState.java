package com.taskflow.calendar.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "calendar_sync_state", uniqueConstraints = {
    @UniqueConstraint(name = "uq_sync_state_conn_ext_id", columnNames = {"calendar_connection_id", "external_calendar_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarSyncState {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calendar_connection_id", nullable = false)
    private CalendarConnection calendarConnection;

    @Column(name = "external_calendar_id", nullable = false)
    private String externalCalendarId;

    @Builder.Default
    @Column(name = "sync_type", length = 50)
    private String syncType = "INCREMENTAL"; // 'FULL', 'INCREMENTAL'

    @Column(name = "sync_token", length = 500)
    private String syncToken; // Google nextSyncToken

    @Column(name = "delta_link", columnDefinition = "TEXT")
    private String deltaLink; // Microsoft Graph deltaLink

    @Column(name = "last_full_sync_at")
    private Instant lastFullSyncAt;

    @Column(name = "last_incremental_sync_at")
    private Instant lastIncrementalSyncAt;

    @Column(name = "sync_started_at")
    private Instant syncStartedAt;

    @Column(name = "sync_completed_at")
    private Instant syncCompletedAt;

    @Builder.Default
    @Column(name = "status", length = 50)
    private String status = "IDLE"; // 'IDLE', 'SYNCING', 'ERROR'

    @Column(name = "error", columnDefinition = "TEXT")
    private String error;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
