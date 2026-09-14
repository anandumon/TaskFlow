package com.taskflow.calendar.entity;

import com.taskflow.identity.entity.User;
import com.taskflow.workspace.entity.Workspace;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "calendar_sync_policy", uniqueConstraints = {
    @UniqueConstraint(name = "uq_sync_policy_user_ws", columnNames = {"user_id", "workspace_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarSyncPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calendar_connection_id")
    private CalendarConnection calendarConnection;

    @Column(name = "external_calendar_id")
    private String externalCalendarId;

    @Builder.Default
    @Column(name = "sync_tasks")
    private Boolean syncTasks = true;

    @Builder.Default
    @Column(name = "sync_projects")
    private Boolean syncProjects = true;

    @Builder.Default
    @Column(name = "sync_deadlines")
    private Boolean syncDeadlines = true;

    @Builder.Default
    @Column(name = "sync_reminders")
    private Boolean syncReminders = true;

    @Builder.Default
    @Column(name = "import_external_events")
    private Boolean importExternalEvents = false;

    @Builder.Default
    @Column(name = "export_taskflow_events")
    private Boolean exportTaskflowEvents = true;

    @Builder.Default
    @Column(name = "default_task_duration_minutes")
    private Integer defaultTaskDurationMinutes = 30;

    @Builder.Default
    @Column(name = "default_reminder_minutes")
    private Integer defaultReminderMinutes = 30;

    @Builder.Default
    @Column(name = "delete_external_on_task_delete")
    private Boolean deleteExternalOnTaskDelete = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
