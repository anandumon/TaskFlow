-- ============================================================
-- V1: Core user and authentication tables
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    display_name    VARCHAR(200),
    avatar_url      VARCHAR(500),
    bio             TEXT,
    job_title       VARCHAR(200),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    language        VARCHAR(10) DEFAULT 'en',
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    availability    VARCHAR(20) DEFAULT 'ONLINE',
    department      VARCHAR(200),
    working_hours   JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}',
    notification_preferences JSONB DEFAULT '{}',
    email_verified  BOOLEAN DEFAULT FALSE,
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    mfa_secret      VARCHAR(255),
    auth_provider   VARCHAR(50) DEFAULT 'LOCAL',
    provider_id     VARCHAR(255),
    last_login_at   TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted         BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted = false;
CREATE INDEX idx_users_status ON users(status) WHERE deleted = false;
CREATE INDEX idx_users_auth_provider ON users(auth_provider, provider_id) WHERE deleted = false;

-- ── Refresh Tokens ──────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    device_info     VARCHAR(500),
    ip_address      VARCHAR(45),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked = false;
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
