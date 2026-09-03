-- =============================================================================
-- TaskFlow — Complete Supabase PostgreSQL Schema & RBAC Seed Script
-- Run this directly in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================================

-- ── 1. Enable Required Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. Users Table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                   VARCHAR(255) NOT NULL,
    password_hash           VARCHAR(255),
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100) NOT NULL,
    display_name            VARCHAR(200),
    avatar_url              VARCHAR(500),
    bio                     TEXT,
    job_title               VARCHAR(200),
    timezone                VARCHAR(50) DEFAULT 'UTC',
    language                VARCHAR(10) DEFAULT 'en',
    status                  VARCHAR(20) DEFAULT 'ACTIVE',
    availability            VARCHAR(20) DEFAULT 'ONLINE',
    department              VARCHAR(200),
    working_hours           JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}',
    notification_preferences JSONB DEFAULT '{}',
    email_verified          BOOLEAN DEFAULT FALSE,
    mfa_enabled             BOOLEAN DEFAULT FALSE,
    mfa_secret              VARCHAR(255),
    auth_provider           VARCHAR(50) DEFAULT 'LOCAL',
    provider_id             VARCHAR(255),
    last_login_at           TIMESTAMP WITH TIME ZONE,
    failed_login_attempts   INTEGER DEFAULT 0,
    locked_until            TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted                 BOOLEAN DEFAULT FALSE,
    version                 INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider, provider_id) WHERE deleted = false;

-- ── 3. Refresh Tokens Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    device_info     VARCHAR(500),
    ip_address      VARCHAR(45),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ── 4. Organizations Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL,
    logo_url        VARCHAR(500),
    domain          VARCHAR(255),
    plan            VARCHAR(50) DEFAULT 'FREE',
    settings        JSONB DEFAULT '{}',
    owner_id        UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted         BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_slug ON organizations(slug) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_orgs_owner ON organizations(owner_id);

-- ── 5. Organization Members & Invitations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID,
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_unique ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

CREATE TABLE IF NOT EXISTS organization_invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    role_id         UUID,
    invited_by      UUID NOT NULL REFERENCES users(id),
    token           VARCHAR(255) NOT NULL UNIQUE,
    status          VARCHAR(20) DEFAULT 'PENDING',
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token);

-- ── 6. Workspaces & Members ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_slug_org ON workspaces(organization_id, slug) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_ws_org ON workspaces(organization_id) WHERE deleted = false;

CREATE TABLE IF NOT EXISTS workspace_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID,
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_members_unique ON workspace_members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_ws ON workspace_members(workspace_id);

-- ── 7. Teams & Members ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
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

CREATE INDEX IF NOT EXISTS idx_teams_workspace ON teams(workspace_id) WHERE deleted = false;

CREATE TABLE IF NOT EXISTS team_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) DEFAULT 'MEMBER',
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique ON team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ── 8. RBAC: Roles, Permissions, Mappings ────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN DEFAULT FALSE,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(organization_id);

CREATE TABLE IF NOT EXISTS permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(100) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- Add Role Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_org_members_role') THEN
        ALTER TABLE organization_members ADD CONSTRAINT fk_org_members_role FOREIGN KEY (role_id) REFERENCES roles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ws_members_role') THEN
        ALTER TABLE workspace_members ADD CONSTRAINT fk_ws_members_role FOREIGN KEY (role_id) REFERENCES roles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_org_invitations_role') THEN
        ALTER TABLE organization_invitations ADD CONSTRAINT fk_org_invitations_role FOREIGN KEY (role_id) REFERENCES roles(id);
    END IF;
END $$;

-- ── 9. Audit Logs Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID,
    before_state    JSONB,
    after_state     JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_time ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- ── 10. Seed Permissions and System Roles ────────────────────────────────────
INSERT INTO permissions (id, code, name, description, category) VALUES
-- Workspace
(uuid_generate_v4(), 'workspace.view',     'View Workspace',    'View workspace details',     'workspace'),
(uuid_generate_v4(), 'workspace.edit',     'Edit Workspace',    'Edit workspace settings',    'workspace'),
(uuid_generate_v4(), 'workspace.delete',   'Delete Workspace',  'Delete workspace',           'workspace'),
-- Space
(uuid_generate_v4(), 'space.view',         'View Space',        'View spaces',                'space'),
(uuid_generate_v4(), 'space.create',       'Create Space',      'Create spaces',              'space'),
(uuid_generate_v4(), 'space.edit',         'Edit Space',        'Edit spaces',                'space'),
(uuid_generate_v4(), 'space.delete',       'Delete Space',      'Delete spaces',              'space'),
-- Project
(uuid_generate_v4(), 'project.view',       'View Project',      'View projects',              'project'),
(uuid_generate_v4(), 'project.create',     'Create Project',    'Create projects',            'project'),
(uuid_generate_v4(), 'project.edit',       'Edit Project',      'Edit projects',              'project'),
(uuid_generate_v4(), 'project.delete',     'Delete Project',    'Delete projects',            'project'),
-- Task
(uuid_generate_v4(), 'task.view',          'View Task',         'View tasks',                 'task'),
(uuid_generate_v4(), 'task.create',        'Create Task',       'Create tasks',               'task'),
(uuid_generate_v4(), 'task.edit',          'Edit Task',         'Edit tasks',                 'task'),
(uuid_generate_v4(), 'task.delete',        'Delete Task',       'Delete tasks',               'task'),
(uuid_generate_v4(), 'task.assign',        'Assign Task',       'Assign tasks to users',      'task'),
(uuid_generate_v4(), 'task.comment',       'Comment on Task',   'Add comments to tasks',      'task'),
(uuid_generate_v4(), 'task.move',          'Move Task',         'Move tasks between lists',   'task'),
(uuid_generate_v4(), 'task.archive',       'Archive Task',      'Archive tasks',              'task'),
-- Dashboard
(uuid_generate_v4(), 'dashboard.view',     'View Dashboard',    'View dashboards',            'dashboard'),
(uuid_generate_v4(), 'dashboard.edit',     'Edit Dashboard',    'Edit dashboards',            'dashboard'),
-- Document
(uuid_generate_v4(), 'document.view',      'View Document',     'View documents',             'document'),
(uuid_generate_v4(), 'document.edit',      'Edit Document',     'Edit documents',             'document'),
-- Automation
(uuid_generate_v4(), 'automation.view',    'View Automation',   'View automations',           'automation'),
(uuid_generate_v4(), 'automation.manage',  'Manage Automation', 'Create/edit automations',    'automation'),
-- Billing
(uuid_generate_v4(), 'billing.view',       'View Billing',      'View billing information',   'billing'),
(uuid_generate_v4(), 'billing.manage',     'Manage Billing',    'Manage billing settings',    'billing'),
-- Users
(uuid_generate_v4(), 'users.invite',       'Invite Users',      'Invite users to org',        'users'),
(uuid_generate_v4(), 'users.remove',       'Remove Users',      'Remove users from org',      'users'),
-- Audit
(uuid_generate_v4(), 'audit.view',         'View Audit Log',    'View audit logs',            'audit'),
-- Team
(uuid_generate_v4(), 'team.create',        'Create Team',       'Create teams',               'team'),
(uuid_generate_v4(), 'team.edit',          'Edit Team',         'Edit teams',                 'team'),
(uuid_generate_v4(), 'team.delete',        'Delete Team',       'Delete teams',               'team')
ON CONFLICT (code) DO NOTHING;

-- Seed System Roles
INSERT INTO roles (id, organization_id, name, description, is_system, is_default)
VALUES 
('a0000000-0000-0000-0000-000000000001', NULL, 'Owner', 'Full control over the organization', true, false),
('a0000000-0000-0000-0000-000000000002', NULL, 'Admin', 'Administrative access', true, false),
('a0000000-0000-0000-0000-000000000003', NULL, 'Manager', 'Team and project management', true, false),
('a0000000-0000-0000-0000-000000000004', NULL, 'Member', 'Standard member access', true, true),
('a0000000-0000-0000-0000-000000000005', NULL, 'Guest', 'Limited guest access', true, false)
ON CONFLICT (id) DO NOTHING;

-- Map Permissions to Roles
-- Owner (all permissions)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000002', id FROM permissions
WHERE code NOT IN ('billing.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN (
    'workspace.view', 'space.view', 'space.create', 'space.edit',
    'project.view', 'project.create', 'project.edit', 'project.delete',
    'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.comment', 'task.move', 'task.archive',
    'dashboard.view', 'dashboard.edit', 'document.view', 'document.edit',
    'automation.view', 'automation.manage', 'users.invite',
    'team.create', 'team.edit', 'team.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN (
    'workspace.view', 'space.view',
    'project.view', 'project.create', 'project.edit',
    'task.view', 'task.create', 'task.edit', 'task.assign', 'task.comment', 'task.move',
    'dashboard.view', 'document.view', 'document.edit'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Guest
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000005', id FROM permissions
WHERE code IN ('workspace.view', 'space.view', 'project.view', 'task.view', 'task.comment', 'dashboard.view', 'document.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;
