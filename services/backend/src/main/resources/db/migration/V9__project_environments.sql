-- =============================================================================
-- Migration: V9__project_environments.sql
-- Description: Add custom environments column to projects table
-- =============================================================================

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS environments VARCHAR(255) NOT NULL DEFAULT 'DEV,SIT,UAT,RELEASE,MAIN';
