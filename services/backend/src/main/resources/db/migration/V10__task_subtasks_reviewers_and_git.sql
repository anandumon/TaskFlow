-- =============================================================================
-- Migration: V10__task_subtasks_reviewers_and_git.sql
-- Description: Add subtasks, multiple assignees, reviewer, git branch, files changed, and notes
-- =============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks TEXT DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees TEXT DEFAULT 'You';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(255) DEFAULT 'Lead Reviewer';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255) DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS files_changed TEXT DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS history_logs TEXT DEFAULT '[]';
