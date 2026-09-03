-- ============================================================
-- V4: Teams and membership
-- ============================================================

CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    color           VARCHAR(7) DEFAULT '#8B5CF6',
    icon            VARCHAR(50) DEFAULT 'users',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted         BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_teams_workspace ON teams(workspace_id) WHERE deleted = false;

-- ── Team Members ─────────────────────────────────────────────
CREATE TABLE team_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) DEFAULT 'MEMBER',
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_team_members_unique ON team_members(team_id, user_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
