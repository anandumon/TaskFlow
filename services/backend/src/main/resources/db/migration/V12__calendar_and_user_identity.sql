-- ============================================================
-- V12: Calendar & User Identity schema matching architecture
-- ============================================================

-- ── 1. User Identity (Multi-provider support) ─────────────────
CREATE TABLE IF NOT EXISTS user_identity (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider                VARCHAR(50) NOT NULL, -- 'google', 'local', 'microsoft'
    provider_user_id        VARCHAR(255) NOT NULL,
    provider_email          VARCHAR(255),
    provider_email_verified BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_identity_provider_uid UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identity_user_id ON user_identity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identity_provider ON user_identity(provider, provider_email);

-- ── 2. Calendar Connection ────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_connection (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider                VARCHAR(50) NOT NULL, -- 'google', 'microsoft'
    provider_account_id     VARCHAR(255),
    provider_email          VARCHAR(255),
    access_token            BYTEA,
    refresh_token           BYTEA,
    token_expires_at        TIMESTAMP WITH TIME ZONE,
    scope                   TEXT,
    status                  VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'REVOKED', 'SYNCED'
    last_sync_at            TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_calendar_connection_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_conn_user ON calendar_connection(user_id);

-- ── 3. External Calendar ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_calendar (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id           UUID NOT NULL REFERENCES calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id    VARCHAR(255) NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    timezone                VARCHAR(100),
    is_primary              BOOLEAN DEFAULT FALSE,
    sync_enabled            BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_external_calendar_conn_ext_id UNIQUE (connection_id, external_calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_external_calendar_conn ON external_calendar(connection_id);

-- ── 4. Calendar Event ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_event (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id             UUID REFERENCES external_calendar(id) ON DELETE CASCADE,
    external_event_id       VARCHAR(255),
    title                   VARCHAR(500) NOT NULL,
    description             TEXT,
    start_at                TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at                  TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone                VARCHAR(100) DEFAULT 'UTC',
    all_day                 BOOLEAN DEFAULT FALSE,
    status                  VARCHAR(50) DEFAULT 'CONFIRMED',
    etag                    VARCHAR(255),
    last_synced_at          TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_user ON calendar_event(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_cal ON calendar_event(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_time ON calendar_event(start_at, end_at);

-- ── 5. Calendar Sync Log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_sync_log (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id           UUID NOT NULL REFERENCES calendar_connection(id) ON DELETE CASCADE,
    sync_type               VARCHAR(50) NOT NULL, -- 'FULL', 'INCREMENTAL', 'TWO_WAY'
    status                  VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'IN_PROGRESS'
    records_created         INTEGER DEFAULT 0,
    records_updated         INTEGER DEFAULT 0,
    records_deleted         INTEGER DEFAULT 0,
    error_message           TEXT,
    synced_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_conn ON calendar_sync_log(connection_id);
