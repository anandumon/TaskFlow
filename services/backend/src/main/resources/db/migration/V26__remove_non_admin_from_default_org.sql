-- ============================================================
-- V26: Remove non-admin users from default TaskFlow HQ organization and workspaces
-- ensures every new user gets a completely fresh workspace/org setup
-- ============================================================

-- Remove non-admin users from organization members of TaskFlow HQ
DELETE FROM organization_members
WHERE organization_id IN (
    SELECT id FROM organizations WHERE slug = 'taskflow-hq' OR name ILIKE '%TaskFlow HQ%'
)
AND user_id NOT IN (
    SELECT id FROM users WHERE email = 'admin@taskflow.dev'
);

-- Remove non-admin users from workspace members of TaskFlow HQ workspaces
DELETE FROM workspace_members
WHERE workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN organizations o ON w.organization_id = o.id
    WHERE o.slug = 'taskflow-hq' OR o.name ILIKE '%TaskFlow HQ%'
)
AND user_id NOT IN (
    SELECT id FROM users WHERE email = 'admin@taskflow.dev'
);
