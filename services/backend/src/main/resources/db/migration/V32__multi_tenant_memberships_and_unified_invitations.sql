-- ============================================================
-- V32: Multi-Tenant Memberships, Scoped Invitations, and RBAC
-- ============================================================

-- 1. Add status to organization_members and workspace_members if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_members' AND column_name = 'status'
    ) THEN
        ALTER TABLE organization_members ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspace_members' AND column_name = 'status'
    ) THEN
        ALTER TABLE workspace_members ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_ws_members_status ON workspace_members(status);

-- 2. Create project_memberships table
CREATE TABLE IF NOT EXISTS project_memberships (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID REFERENCES roles(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_memberships_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_memberships_user ON project_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_project ON project_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_status ON project_memberships(status);

-- 3. Create unified invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    scope           VARCHAR(50) NOT NULL, -- 'ORGANIZATION', 'WORKSPACE', 'PROJECT'
    role_id         UUID REFERENCES roles(id),
    invited_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_scope ON invitations(scope);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_ws ON invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_project ON invitations(project_id);

-- 4. Seed missing permissions (both dot and underscore formats supported)
INSERT INTO permissions (id, code, name, description, category)
VALUES
-- Organization
(uuid_generate_v4(), 'ORGANIZATION_VIEW', 'View Organization', 'View organization details', 'organization'),
(uuid_generate_v4(), 'ORGANIZATION_UPDATE', 'Update Organization', 'Update organization details', 'organization'),
(uuid_generate_v4(), 'ORGANIZATION_DELETE', 'Delete Organization', 'Delete organization', 'organization'),
(uuid_generate_v4(), 'ORGANIZATION_INVITE', 'Invite to Organization', 'Invite users to organization', 'organization'),
(uuid_generate_v4(), 'ORGANIZATION_REMOVE_MEMBER', 'Remove Organization Member', 'Remove members from organization', 'organization'),
(uuid_generate_v4(), 'ORGANIZATION_MANAGE_ROLES', 'Manage Organization Roles', 'Manage roles and permissions in organization', 'organization'),
-- Workspace
(uuid_generate_v4(), 'WORKSPACE_VIEW', 'View Workspace', 'View workspace details', 'workspace'),
(uuid_generate_v4(), 'WORKSPACE_CREATE', 'Create Workspace', 'Create new workspaces', 'workspace'),
(uuid_generate_v4(), 'WORKSPACE_UPDATE', 'Update Workspace', 'Update workspace details', 'workspace'),
(uuid_generate_v4(), 'WORKSPACE_DELETE', 'Delete Workspace', 'Delete workspace', 'workspace'),
(uuid_generate_v4(), 'WORKSPACE_INVITE', 'Invite to Workspace', 'Invite users to workspace', 'workspace'),
(uuid_generate_v4(), 'WORKSPACE_REMOVE_MEMBER', 'Remove Workspace Member', 'Remove members from workspace', 'workspace'),
-- Project
(uuid_generate_v4(), 'PROJECT_VIEW', 'View Project', 'View project details', 'project'),
(uuid_generate_v4(), 'PROJECT_CREATE', 'Create Project', 'Create new projects', 'project'),
(uuid_generate_v4(), 'PROJECT_UPDATE', 'Update Project', 'Update project details', 'project'),
(uuid_generate_v4(), 'PROJECT_DELETE', 'Delete Project', 'Delete project', 'project'),
(uuid_generate_v4(), 'PROJECT_INVITE', 'Invite to Project', 'Invite users to project', 'project'),
(uuid_generate_v4(), 'PROJECT_REMOVE_MEMBER', 'Remove Project Member', 'Remove members from project', 'project'),
(uuid_generate_v4(), 'PROJECT_MANAGE_ROLES', 'Manage Project Roles', 'Manage project roles', 'project'),
-- Task
(uuid_generate_v4(), 'TASK_VIEW', 'View Task', 'View task details', 'task'),
(uuid_generate_v4(), 'TASK_CREATE', 'Create Task', 'Create new tasks', 'task'),
(uuid_generate_v4(), 'TASK_UPDATE', 'Update Task', 'Update tasks', 'task'),
(uuid_generate_v4(), 'TASK_DELETE', 'Delete Task', 'Delete tasks', 'task'),
(uuid_generate_v4(), 'TASK_ASSIGN', 'Assign Task', 'Assign tasks to members', 'task'),
(uuid_generate_v4(), 'TASK_COMMENT', 'Comment on Task', 'Comment on tasks', 'task'),
(uuid_generate_v4(), 'TASK_COMPLETE', 'Complete Task', 'Mark tasks as complete', 'task'),
(uuid_generate_v4(), 'TASK_REOPEN', 'Reopen Task', 'Reopen completed tasks', 'task'),
(uuid_generate_v4(), 'TASK_MOVE', 'Move Task', 'Move tasks across lists/status', 'task')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed Workspace System Roles
INSERT INTO roles (id, organization_id, name, description, is_system, is_default)
VALUES
('b0000000-0000-0000-0000-000000000001', NULL, 'Workspace Admin', 'Full control over workspace and child projects', true, false),
('b0000000-0000-0000-0000-000000000002', NULL, 'Workspace Member', 'Can view workspace and create/edit projects and tasks', true, true),
('b0000000-0000-0000-0000-000000000003', NULL, 'Workspace Viewer', 'Read-only access to workspace and child projects', true, false)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Project System Roles
INSERT INTO roles (id, organization_id, name, description, is_system, is_default)
VALUES
('c0000000-0000-0000-0000-000000000001', NULL, 'Project Admin', 'Full control over project deliverables and members', true, false),
('c0000000-0000-0000-0000-000000000002', NULL, 'Project Editor', 'Can create, edit, complete and move tasks within the project', true, true),
('c0000000-0000-0000-0000-000000000003', NULL, 'Project Commenter', 'Can view tasks and post comments', true, false),
('c0000000-0000-0000-0000-000000000004', NULL, 'Project Viewer', 'Read-only access to project and tasks', true, false)
ON CONFLICT (id) DO NOTHING;

-- 7. Map permissions to Workspace and Project roles
-- Workspace Admin
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000001', id FROM permissions
WHERE code IN (
    'WORKSPACE_VIEW', 'WORKSPACE_UPDATE', 'WORKSPACE_INVITE', 'WORKSPACE_REMOVE_MEMBER',
    'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE', 'PROJECT_INVITE', 'PROJECT_REMOVE_MEMBER', 'PROJECT_MANAGE_ROLES',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_ASSIGN', 'TASK_COMMENT', 'TASK_COMPLETE', 'TASK_REOPEN', 'TASK_MOVE',
    'workspace.view', 'workspace.edit', 'project.view', 'project.create', 'project.edit', 'project.delete',
    'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.comment', 'task.move'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Workspace Member
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000002', id FROM permissions
WHERE code IN (
    'WORKSPACE_VIEW',
    'PROJECT_VIEW', 'PROJECT_CREATE',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_ASSIGN', 'TASK_COMMENT', 'TASK_COMPLETE', 'TASK_MOVE',
    'workspace.view', 'project.view', 'project.create',
    'task.view', 'task.create', 'task.edit', 'task.assign', 'task.comment', 'task.move'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Workspace Viewer
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'b0000000-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN (
    'WORKSPACE_VIEW', 'PROJECT_VIEW', 'TASK_VIEW',
    'workspace.view', 'project.view', 'task.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Project Admin
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'c0000000-0000-0000-0000-000000000001', id FROM permissions
WHERE code IN (
    'PROJECT_VIEW', 'PROJECT_UPDATE', 'PROJECT_DELETE', 'PROJECT_INVITE', 'PROJECT_REMOVE_MEMBER', 'PROJECT_MANAGE_ROLES',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_ASSIGN', 'TASK_COMMENT', 'TASK_COMPLETE', 'TASK_REOPEN', 'TASK_MOVE',
    'project.view', 'project.edit', 'project.delete',
    'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.comment', 'task.move'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Project Editor
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'c0000000-0000-0000-0000-000000000002', id FROM permissions
WHERE code IN (
    'PROJECT_VIEW',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_ASSIGN', 'TASK_COMMENT', 'TASK_COMPLETE', 'TASK_MOVE',
    'project.view',
    'task.view', 'task.create', 'task.edit', 'task.assign', 'task.comment', 'task.move'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Project Commenter
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'c0000000-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN (
    'PROJECT_VIEW', 'TASK_VIEW', 'TASK_COMMENT',
    'project.view', 'task.view', 'task.comment'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Project Viewer
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'c0000000-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN (
    'PROJECT_VIEW', 'TASK_VIEW',
    'project.view', 'task.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Map new permissions to Org Owner and Org Admin as well
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000002', id FROM permissions
WHERE code NOT IN ('billing.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;
