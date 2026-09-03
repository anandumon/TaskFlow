package com.taskflow.calendar.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "calendar_sync_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connection_id", nullable = false)
    private CalendarConnection connection;

    @Column(name = "sync_type", nullable = false, length = 50)
    private String syncType; // 'FULL', 'INCREMENTAL', 'TWO_WAY'

    @Column(name = "status", nullable = false, length = 50)
    private String status; // 'SUCCESS', 'FAILED', 'IN_PROGRESS'

    @Column(name = "records_created")
    private Integer recordsCreated;

    @Column(name = "records_updated")
    private Integer recordsUpdated;

    @Column(name = "records_deleted")
    private Integer recordsDeleted;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "synced_at", nullable = false, updatable = false)
    private Instant syncedAt;
}
