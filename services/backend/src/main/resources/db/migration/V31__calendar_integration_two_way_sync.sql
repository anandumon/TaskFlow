-- ============================================================
-- V31: Production-grade Google & Microsoft Calendar 2-Way Sync
-- ============================================================

-- 1. Enhance calendar_connection columns
ALTER TABLE calendar_connection
    ADD COLUMN IF NOT EXISTS last_successful_sync_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_sync_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- 2. Enhance external_calendar columns
ALTER TABLE external_calendar
    ADD COLUMN IF NOT EXISTS can_read BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_write BOOLEAN DEFAULT TRUE;

-- 3. Enhance calendar_event columns
ALTER TABLE calendar_event
    ADD COLUMN IF NOT EXISTS meeting_url VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS location VARCHAR(500),
    ADD COLUMN IF NOT EXISTS external_updated_at TIMESTAMP WITH TIME ZONE;

-- 4. Calendar Event Mapping (Bidirectional TaskFlow <-> Calendar representation)
CREATE TABLE IF NOT EXISTS calendar_event_mapping (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id                 UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id              UUID REFERENCES projects(id) ON DELETE CASCADE,
    calendar_connection_id  UUID NOT NULL REFERENCES calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id    VARCHAR(255) NOT NULL,
    external_event_id       VARCHAR(255) NOT NULL,
    external_event_etag     VARCHAR(255),
    sync_direction          VARCHAR(50) DEFAULT 'TWO_WAY', -- 'TWO_WAY', 'OUTBOUND', 'INBOUND'
    source                  VARCHAR(50) DEFAULT 'TASKFLOW', -- 'TASKFLOW', 'GOOGLE', 'MICROSOFT'
    last_synced_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_mapping_conn_cal_event UNIQUE (calendar_connection_id, external_calendar_id, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_mapping_task ON calendar_event_mapping(task_id);
CREATE INDEX IF NOT EXISTS idx_event_mapping_project ON calendar_event_mapping(project_id);
CREATE INDEX IF NOT EXISTS idx_event_mapping_user ON calendar_event_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_event_mapping_conn ON calendar_event_mapping(calendar_connection_id);

-- 5. Calendar Sync State (Incremental sync tokens & delta links per calendar)
CREATE TABLE IF NOT EXISTS calendar_sync_state (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_connection_id  UUID NOT NULL REFERENCES calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id    VARCHAR(255) NOT NULL,
    sync_type               VARCHAR(50) DEFAULT 'INCREMENTAL', -- 'FULL', 'INCREMENTAL'
    sync_token              VARCHAR(500), -- Google Calendar nextSyncToken
    delta_link              TEXT,         -- Microsoft Graph deltaLink
    last_full_sync_at       TIMESTAMP WITH TIME ZONE,
    last_incremental_sync_at TIMESTAMP WITH TIME ZONE,
    sync_started_at         TIMESTAMP WITH TIME ZONE,
    sync_completed_at       TIMESTAMP WITH TIME ZONE,
    status                  VARCHAR(50) DEFAULT 'IDLE', -- 'IDLE', 'SYNCING', 'ERROR'
    error                   TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sync_state_conn_ext_id UNIQUE (calendar_connection_id, external_calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_state_conn ON calendar_sync_state(calendar_connection_id);

-- 6. Calendar Sync Policy (Workspace & User policy rules)
CREATE TABLE IF NOT EXISTS calendar_sync_policy (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id                    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    calendar_connection_id          UUID REFERENCES calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id            VARCHAR(255),
    sync_tasks                      BOOLEAN DEFAULT TRUE,
    sync_projects                   BOOLEAN DEFAULT TRUE,
    sync_deadlines                  BOOLEAN DEFAULT TRUE,
    sync_reminders                  BOOLEAN DEFAULT TRUE,
    import_external_events          BOOLEAN DEFAULT FALSE,
    export_taskflow_events          BOOLEAN DEFAULT TRUE,
    default_task_duration_minutes   INT DEFAULT 30,
    default_reminder_minutes        INT DEFAULT 30,
    delete_external_on_task_delete  BOOLEAN DEFAULT TRUE,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sync_policy_user_ws UNIQUE (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_policy_user ON calendar_sync_policy(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_policy_ws ON calendar_sync_policy(workspace_id);

-- 7. Calendar Webhook Subscriptions (Google push notification channels & MS Graph subscriptions)
CREATE TABLE IF NOT EXISTS calendar_webhook_subscription (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_connection_id  UUID NOT NULL REFERENCES calendar_connection(id) ON DELETE CASCADE,
    subscription_id         VARCHAR(255) NOT NULL, -- MS Graph subscriptionId or Google channelId
    resource_id             VARCHAR(255),          -- Google resourceId
    resource                VARCHAR(500),          -- Target resource, e.g. me/events
    client_state            VARCHAR(255),
    expiration_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_webhook_sub_conn_id UNIQUE (calendar_connection_id, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_sub_conn ON calendar_webhook_subscription(calendar_connection_id);
CREATE INDEX IF NOT EXISTS idx_webhook_sub_exp ON calendar_webhook_subscription(expiration_at);
