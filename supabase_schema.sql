-- =============================================================================
-- TaskFlow — Complete PostgreSQL DDL Schema (Pure DDL / 0 Data)
-- Comprehensive schema for Supabase and vanilla PostgreSQL 14+
-- =============================================================================

-- ── 1. Enable Required Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. Users Table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id                UUID,
    email                       VARCHAR(255) NOT NULL,
    password_hash               VARCHAR(255),
    username                    VARCHAR(50),
    first_name                  VARCHAR(100) NOT NULL,
    last_name                   VARCHAR(100) NOT NULL,
    display_name                VARCHAR(200),
    avatar_url                  VARCHAR(500),
    bio                         TEXT,
    job_title                   VARCHAR(200),
    timezone                    VARCHAR(50) DEFAULT 'UTC',
    language                    VARCHAR(10) DEFAULT 'en',
    status                      VARCHAR(20) DEFAULT 'ACTIVE',
    availability                VARCHAR(20) DEFAULT 'ONLINE',
    department                  VARCHAR(200),
    working_hours               JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}',
    notification_preferences     JSONB DEFAULT '{}',
    email_verified              BOOLEAN DEFAULT FALSE,
    mfa_enabled                 BOOLEAN DEFAULT FALSE,
    mfa_secret                  VARCHAR(255),
    auth_provider               VARCHAR(50) DEFAULT 'LOCAL',
    provider_id                 VARCHAR(255),
    last_login_at               TIMESTAMP WITH TIME ZONE,
    failed_login_attempts       INTEGER DEFAULT 0,
    locked_until                TIMESTAMP WITH TIME ZONE,
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted                     BOOLEAN DEFAULT FALSE,
    version                     INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username)) WHERE (deleted = false OR deleted IS NULL);
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

-- ── 4. Email Verification OTP Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_otp (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash        VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count   INTEGER DEFAULT 0,
    max_attempts    INTEGER DEFAULT 5,
    resend_count    INTEGER DEFAULT 0,
    last_sent_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    verified_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted         BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email_otp_user ON email_verification_otp(user_id) WHERE status = 'ACTIVE';

-- ── 5. Organizations Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(100) NOT NULL UNIQUE,
    logo_url            VARCHAR(500),
    owner_id            UUID NOT NULL REFERENCES users(id),
    plan                VARCHAR(20) DEFAULT 'FREE',
    subscription_status VARCHAR(20) DEFAULT 'TRIALING',
    max_workspaces      INTEGER DEFAULT 5,
    max_members         INTEGER DEFAULT 25,
    storage_limit_mb    INTEGER DEFAULT 5120,
    custom_domain       VARCHAR(255),
    settings            JSONB DEFAULT '{}',
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted             BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id) WHERE deleted = false;

-- ── 6. Organization Members Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- ── 7. Workspaces Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    description     TEXT,
    color           VARCHAR(20) DEFAULT '#6366f1',
    icon            VARCHAR(50) DEFAULT 'Folder',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted         BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_org_workspace_slug UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_org ON workspaces(organization_id) WHERE deleted = false;

-- ── 8. Workspace Members Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ws_members_ws ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_user ON workspace_members(user_id);

-- ── 9. Projects Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(50) DEFAULT 'ACTIVE',
    progress        INTEGER DEFAULT 0,
    color           VARCHAR(50) DEFAULT '#3b82f6',
    icon            TEXT DEFAULT 'Folder',
    environments    VARCHAR(255) DEFAULT 'DEV,SIT,UAT,RELEASE,MAIN',
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted         BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- ── 10. Project Memberships Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_memberships (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         VARCHAR(50) DEFAULT 'MEMBER',
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    joined_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_membership UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_memberships_proj ON project_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_user ON project_memberships(user_id);

-- ── 11. Project Invitations Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'MEMBER',
    token           VARCHAR(255) NOT NULL UNIQUE,
    invited_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    status          VARCHAR(50) DEFAULT 'PENDING',
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_invitations_proj ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);

-- ── 12. Tasks Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(50) DEFAULT 'todo',
    environment     VARCHAR(50) DEFAULT 'DEV',
    priority        VARCHAR(50) DEFAULT 'medium',
    tag             VARCHAR(100) DEFAULT 'Frontend',
    tag_color       VARCHAR(50) DEFAULT 'blue',
    assignee_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    assignee_name   VARCHAR(150) DEFAULT 'You',
    due_date        VARCHAR(100) DEFAULT 'Tomorrow',
    subtasks        JSONB DEFAULT '[]'::jsonb,
    assignees       TEXT DEFAULT 'You',
    reviewer_name   VARCHAR(150) DEFAULT 'Lead Reviewer',
    branch_name     TEXT,
    files_changed   JSONB DEFAULT '[]'::jsonb,
    attachments     TEXT,
    notes           TEXT,
    history_logs    JSONB DEFAULT '[]'::jsonb,
    position        INTEGER DEFAULT 0,
    progress        INTEGER DEFAULT 0,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted         BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

-- ── 13. Invitations Table (Workspace / Project Scoped) ────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) NOT NULL,
    organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id        UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
    project_ids         JSONB DEFAULT '[]'::jsonb,
    role                VARCHAR(50) DEFAULT 'MEMBER',
    scope               VARCHAR(50) DEFAULT 'WORKSPACE',
    token               VARCHAR(255) NOT NULL UNIQUE,
    referral_code       VARCHAR(64),
    status              VARCHAR(50) DEFAULT 'PENDING',
    inviter_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_invitations_referral_code ON invitations(referral_code);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON invitations(workspace_id);

-- ── 14. Organization Invitations Table (Org Scoped) ──────────────────────────
CREATE TABLE IF NOT EXISTS organization_invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    token           VARCHAR(255) NOT NULL UNIQUE,
    invited_by      UUID NOT NULL REFERENCES users(id),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_pending_invite UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email);

-- ── 15. Teams Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    color           VARCHAR(20) DEFAULT '#6366f1',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_ws ON teams(workspace_id);

-- ── 16. Team Members Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) DEFAULT 'MEMBER',
    joined_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_member UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ── 17. Chat Channels Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_channels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    project_name    VARCHAR(150),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_private      BOOLEAN DEFAULT FALSE,
    member_ids      JSONB DEFAULT '[]'::jsonb,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_ws ON chat_channels(workspace_id);

-- ── 18. Chat Messages Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id      UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name     VARCHAR(150),
    sender_avatar   TEXT,
    recipient_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    attachments     JSONB DEFAULT '[]'::jsonb,
    is_pinned       BOOLEAN DEFAULT FALSE,
    is_edited       BOOLEAN DEFAULT FALSE,
    deleted_for     JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_dm ON chat_messages(sender_id, recipient_id);

-- ── 19. Calendar Connection Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_connection (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50) NOT NULL DEFAULT 'GOOGLE',
    provider_email      VARCHAR(255),
    connected           BOOLEAN DEFAULT TRUE,
    sync_status         VARCHAR(50) DEFAULT 'IDLE',
    status              VARCHAR(50) DEFAULT 'ACTIVE',
    access_token        TEXT,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMP WITH TIME ZONE,
    last_sync_at        TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_connection_user ON calendar_connection(user_id);

-- ── 20. External Calendar Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_calendar (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id           UUID NOT NULL REFERENCES calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id    VARCHAR(255) NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    timezone                VARCHAR(100),
    is_primary              BOOLEAN DEFAULT FALSE,
    can_read                BOOLEAN DEFAULT TRUE,
    can_write               BOOLEAN DEFAULT TRUE,
    sync_enabled            BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_calendar_conn ON external_calendar(connection_id);

-- Optional compatibility view/table for plural references
CREATE TABLE IF NOT EXISTS external_calendars (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id           UUID NOT NULL REFERENCES calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id    VARCHAR(255) NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    timezone                VARCHAR(100),
    is_primary              BOOLEAN DEFAULT FALSE,
    can_read                BOOLEAN DEFAULT TRUE,
    can_write               BOOLEAN DEFAULT TRUE,
    sync_enabled            BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── 21. Calendar Sync Policy Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_sync_policy (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_connection_id          UUID REFERENCES calendar_connection(id) ON DELETE CASCADE,
    user_id                         UUID REFERENCES users(id) ON DELETE CASCADE,
    external_calendar_id            VARCHAR(255),
    sync_tasks                      BOOLEAN DEFAULT TRUE,
    sync_projects                   BOOLEAN DEFAULT TRUE,
    sync_deadlines                  BOOLEAN DEFAULT TRUE,
    sync_reminders                  BOOLEAN DEFAULT TRUE,
    import_external_events          BOOLEAN DEFAULT FALSE,
    export_taskflow_events          BOOLEAN DEFAULT TRUE,
    default_task_duration_minutes   INTEGER DEFAULT 60,
    default_reminder_minutes        INTEGER DEFAULT 30,
    delete_external_on_task_delete  BOOLEAN DEFAULT TRUE,
    target_calendar_id              VARCHAR(255),
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── 22. Calendar Event Mapping / Link Table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_event_mapping (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id                 UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id              UUID REFERENCES projects(id) ON DELETE CASCADE,
    connection_id           UUID REFERENCES calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id    VARCHAR(255) NOT NULL,
    external_event_id       VARCHAR(255) NOT NULL,
    synced_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_mapping_task ON calendar_event_mapping(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_mapping_project ON calendar_event_mapping(project_id);

CREATE TABLE IF NOT EXISTS calendar_event_link (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id                 UUID REFERENCES tasks(id) ON DELETE CASCADE,
    connection_id           UUID REFERENCES calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id    VARCHAR(255) NOT NULL,
    external_event_id       VARCHAR(255) NOT NULL,
    synced_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_link_task ON calendar_event_link(task_id);

-- ── 23. Roles Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN DEFAULT FALSE,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── 24. Permissions Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(100) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL
);

-- ── 25. Role Permissions Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

-- ── 26. Audit Logs Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    actor_id        UUID NOT NULL REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(50) NOT NULL,
    resource_id     VARCHAR(255) NOT NULL,
    metadata        JSONB DEFAULT '{}',
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);

-- ── 27. User Theme Preferences Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_theme_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme_id        VARCHAR(50) NOT NULL DEFAULT 'NEUTRAL',
    theme_type      VARCHAR(20) NOT NULL DEFAULT 'PRESET',
    custom_theme    JSONB DEFAULT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_user_id ON user_theme_preferences(user_id);

-- ── 28. System RBAC Seed Data (Roles, Permissions & Role Mappings) ─────────────
-- System Permissions (32 Granular Rules)
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
    -- Team
    (uuid_generate_v4(), 'team.create',        'Create Team',       'Create teams',               'team'),
    (uuid_generate_v4(), 'team.edit',          'Edit Team',         'Edit teams',                 'team'),
    (uuid_generate_v4(), 'team.delete',        'Delete Team',       'Delete teams',               'team')
ON CONFLICT (code) DO NOTHING;

-- System Roles (Predefined Global Roles)
INSERT INTO roles (id, organization_id, name, description, is_system, is_default) VALUES 
    ('a0000000-0000-0000-0000-000000000001', NULL, 'Owner',   'Full control over the organization', true, false),
    ('a0000000-0000-0000-0000-000000000002', NULL, 'Admin',   'Administrative access',              true, false),
    ('a0000000-0000-0000-0000-000000000003', NULL, 'Manager', 'Team and project management',        true, false),
    ('a0000000-0000-0000-0000-000000000004', NULL, 'Member',  'Standard member access',             true, true),
    ('a0000000-0000-0000-0000-000000000005', NULL, 'Guest',   'Limited guest access',               true, false)
ON CONFLICT (id) DO NOTHING;

-- Map Default Permissions to System Roles
-- 1. Owner (receives all permissions)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. Admin (receives all permissions except billing.manage)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000002', id FROM permissions
WHERE code NOT IN ('billing.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Manager (project, space, task, dashboard, and team management)
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

-- 4. Member (standard member deliverables and participation)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN (
    'workspace.view', 'space.view',
    'project.view', 'project.create', 'project.edit',
    'task.view', 'task.create', 'task.edit', 'task.assign', 'task.comment', 'task.move',
    'dashboard.view', 'document.view', 'document.edit'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Guest (read-only view and commenting on assigned tasks)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000005', id FROM permissions
WHERE code IN ('workspace.view', 'space.view', 'project.view', 'task.view', 'task.comment', 'dashboard.view', 'document.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 10. GOOGLE CALENDAR & GOOGLE MEET INTEGRATION TABLES
-- ============================================================================

-- 1. Calendar Connections (OAuth 2.0 State & Encrypted Tokens)
CREATE TABLE IF NOT EXISTS public.calendar_connection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE', -- 'GOOGLE', 'MICROSOFT'
    provider_account_id VARCHAR(255),
    provider_email VARCHAR(255) NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED', -- 'CONNECTED', 'REAUTH_REQUIRED', 'DISCONNECTED'
    last_successful_sync_at TIMESTAMPTZ,
    last_error_code VARCHAR(100),
    last_error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_calendar_provider UNIQUE(user_id, provider)
);

-- 2. External Calendars Discovered via Provider API
CREATE TABLE IF NOT EXISTS public.external_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES public.calendar_connection(id) ON DELETE CASCADE,
    external_calendar_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    is_primary BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT TRUE,
    can_write BOOLEAN DEFAULT TRUE,
    selected_for_task_sync BOOLEAN DEFAULT FALSE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_connection_calendar UNIQUE(connection_id, external_calendar_id)
);

-- 3. Calendar Sync Preferences & Policies
CREATE TABLE IF NOT EXISTS public.calendar_sync_policy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    target_calendar_id UUID REFERENCES public.external_calendar(id) ON DELETE SET NULL,
    sync_tasks BOOLEAN DEFAULT TRUE,
    sync_projects BOOLEAN DEFAULT FALSE,
    default_task_duration_minutes INT DEFAULT 30,
    sync_direction VARCHAR(50) DEFAULT 'BIDIRECTIONAL', -- 'EXPORT_ONLY', 'IMPORT_ONLY', 'BIDIRECTIONAL'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_sync_policy UNIQUE(user_id)
);

-- 4. Calendar Event Mapping (Bidirectional Sync Tracking)
CREATE TABLE IF NOT EXISTS public.calendar_event_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taskflow_resource_type VARCHAR(50) NOT NULL, -- 'TASK', 'PROJECT', 'MEETING'
    taskflow_resource_id UUID NOT NULL,
    external_calendar_id VARCHAR(255) NOT NULL,
    external_event_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE',
    sync_direction VARCHAR(50) DEFAULT 'BIDIRECTIONAL',
    last_synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    source_marker VARCHAR(255),
    etag VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_resource_event_mapping UNIQUE(taskflow_resource_type, taskflow_resource_id, provider)
);

-- 5. First-class Relational Meeting Entity (Google Meet & Calendar Events)
CREATE TABLE IF NOT EXISTS public.meeting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    calendar_connection_id UUID REFERENCES public.calendar_connection(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE',
    meeting_type VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_MEET',
    external_event_id VARCHAR(255),
    external_space_id VARCHAR(255),
    meeting_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', 'FAILED'
    host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    attendees JSONB DEFAULT '[]'::JSONB,
    recording_url TEXT,
    transcript_url TEXT,
    transcript_summary TEXT,
    action_items JSONB DEFAULT '[]'::JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_connection_user ON public.calendar_connection(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_task ON public.meeting(task_id);
CREATE INDEX IF NOT EXISTS idx_meeting_project ON public.meeting(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_start_time ON public.meeting(start_time);
CREATE INDEX IF NOT EXISTS idx_meeting_external_event ON public.meeting(external_event_id);
CREATE INDEX IF NOT EXISTS idx_event_mapping_lookup ON public.calendar_event_mapping(taskflow_resource_type, taskflow_resource_id);


