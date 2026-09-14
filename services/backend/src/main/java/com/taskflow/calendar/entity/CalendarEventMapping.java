package com.taskflow.calendar.entity;

import com.taskflow.identity.entity.User;
import com.taskflow.project.entity.Project;
import com.taskflow.task.entity.Task;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "calendar_event_mapping", uniqueConstraints = {
    @UniqueConstraint(name = "uq_event_mapping_conn_cal_event", columnNames = {"calendar_connection_id", "external_calendar_id", "external_event_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEventMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calendar_connection_id", nullable = false)
    private CalendarConnection calendarConnection;

    @Column(name = "external_calendar_id", nullable = false)
    private String externalCalendarId;

    @Column(name = "external_event_id", nullable = false)
    private String externalEventId;

    @Column(name = "external_event_etag")
    private String externalEventEtag;

    @Builder.Default
    @Column(name = "sync_direction", length = 50)
    private String syncDirection = "TWO_WAY";

    @Builder.Default
    @Column(name = "source", length = 50)
    private String source = "TASKFLOW"; // 'TASKFLOW', 'GOOGLE', 'MICROSOFT'

    @Builder.Default
    @Column(name = "last_synced_at", nullable = false)
    private Instant lastSyncedAt = Instant.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
