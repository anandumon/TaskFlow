-- =============================================================================
-- Migration: V33__add_task_progress.sql
-- Description: Add progress percentage column to tasks
-- =============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
