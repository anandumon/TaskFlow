-- =============================================================================
-- Migration: V8__create_projects_and_tasks.sql
-- Description: Create projects and tasks tables with environment tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    progress INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(50) DEFAULT '#6366F1',
    icon VARCHAR(50) DEFAULT 'folder',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug) WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'todo',
    environment VARCHAR(50) NOT NULL DEFAULT 'DEV',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    tag VARCHAR(100) DEFAULT 'Frontend',
    tag_color VARCHAR(100),
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignee_name VARCHAR(255) DEFAULT 'You',
    due_date VARCHAR(100) DEFAULT 'Tomorrow',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_environment ON tasks(environment) WHERE deleted = FALSE;
