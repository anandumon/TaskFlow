-- ============================================================
-- V3: Workspaces and membership
-- ============================================================

CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL,
    description     TEXT,
    color           VARCHAR(7) DEFAULT '#6366F1',
    icon            VARCHAR(50) DEFAULT 'briefcase',
    settings        JSONB DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted         BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX idx_ws_slug_org ON workspaces(organization_id, slug) WHERE deleted = false;
CREATE INDEX idx_ws_org ON workspaces(organization_id) WHERE deleted = false;

-- ── Workspace Members ────────────────────────────────────────
CREATE TABLE workspace_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID,
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ws_members_unique ON workspace_members(workspace_id, user_id);
CREATE INDEX idx_ws_members_user ON workspace_members(user_id);
CREATE INDEX idx_ws_members_ws ON workspace_members(workspace_id);
