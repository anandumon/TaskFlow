-- V29__create_project_invitations.sql
-- Create project_invitations table to support inviting members directly to projects

CREATE TABLE IF NOT EXISTS project_invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    invited_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(255) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    role            VARCHAR(50) DEFAULT 'MEMBER',
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proj_invitations_project ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_proj_invitations_token ON project_invitations(token);
