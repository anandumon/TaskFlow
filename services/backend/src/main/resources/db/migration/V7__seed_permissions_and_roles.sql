-- ============================================================
-- V7: Seed permissions and system roles
-- ============================================================

-- ── Permissions ──────────────────────────────────────────────
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
(uuid_generate_v4(), 'team.delete',        'Delete Team',       'Delete teams',               'team');

-- ── System Roles (organization_id = NULL means global) ───────

-- Owner (all permissions)
INSERT INTO roles (id, organization_id, name, description, is_system, is_default)
VALUES ('a0000000-0000-0000-0000-000000000001', NULL, 'Owner', 'Full control over the organization', true, false);

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', id FROM permissions;

-- Admin (all except billing.manage and audit.view limitations)
INSERT INTO roles (id, organization_id, name, description, is_system, is_default)
VALUES ('a0000000-0000-0000-0000-000000000002', NULL, 'Admin', 'Administrative access', true, false);

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000002', id FROM permissions
WHERE code NOT IN ('billing.manage');

-- Manager
INSERT INTO roles (id, organization_id, name, description, is_system, is_default)
VALUES ('a0000000-0000-0000-0000-000000000003', NULL, 'Manager', 'Team and project management', true, false);

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN (
    'workspace.view', 'space.view', 'space.create', 'space.edit',
    'project.view', 'project.create', 'project.edit', 'project.delete',
    'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.comment', 'task.move', 'task.archive',
    'dashboard.view', 'dashboard.edit', 'document.view', 'document.edit',
    'automation.view', 'automation.manage', 'users.invite',
    'team.create', 'team.edit', 'team.delete'
);

-- Member (default)
INSERT INTO roles (id, organization_id, name, description, is_system, is_default)
VALUES ('a0000000-0000-0000-0000-000000000004', NULL, 'Member', 'Standard member access', true, true);

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN (
    'workspace.view', 'space.view',
    'project.view', 'project.create', 'project.edit',
    'task.view', 'task.create', 'task.edit', 'task.assign', 'task.comment', 'task.move',
    'dashboard.view', 'document.view', 'document.edit'
);

-- Guest (minimal)
INSERT INTO roles (id, organization_id, name, description, is_system, is_default)
VALUES ('a0000000-0000-0000-0000-000000000005', NULL, 'Guest', 'Limited guest access', true, false);

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000005', id FROM permissions
WHERE code IN ('workspace.view', 'space.view', 'project.view', 'task.view', 'task.comment', 'dashboard.view', 'document.view');
