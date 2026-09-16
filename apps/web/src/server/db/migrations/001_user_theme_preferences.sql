-- =============================================================================
-- Migration: 001_user_theme_preferences.sql
-- Creates user_theme_preferences table for per-user persistent theming
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_theme_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme_id        VARCHAR(50) NOT NULL DEFAULT 'NEUTRAL',
    theme_type      VARCHAR(20) NOT NULL DEFAULT 'PRESET',
    custom_theme    JSONB DEFAULT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_user_id ON user_theme_preferences(user_id);
