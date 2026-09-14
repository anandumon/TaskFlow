-- =============================================================================
-- Migration: V30__add_position_and_last_due_alert.sql
-- Description: Add position and last_due_alert_at columns to tasks table
-- =============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_due_alert_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(workspace_id, status, position) WHERE deleted = FALSE;
