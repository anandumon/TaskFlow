-- ============================================================
-- V27: Add ON DELETE CASCADE to organizations.owner_id
-- Automatically cascade deletes from users to organizations
-- ============================================================

-- 1. Recreate organizations_owner_id_fkey with ON DELETE CASCADE
ALTER TABLE organizations
    DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey;

ALTER TABLE organizations
    ADD CONSTRAINT organizations_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- 2. Ensure workspaces.created_by sets null on user delete so it never blocks deletion
ALTER TABLE workspaces
    DROP CONSTRAINT IF EXISTS workspaces_created_by_fkey;

ALTER TABLE workspaces
    ADD CONSTRAINT workspaces_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE SET NULL;

-- 3. Ensure organization_invitations.invited_by cascades on user delete
ALTER TABLE organization_invitations
    DROP CONSTRAINT IF EXISTS organization_invitations_invited_by_fkey;

ALTER TABLE organization_invitations
    ADD CONSTRAINT organization_invitations_invited_by_fkey
    FOREIGN KEY (invited_by)
    REFERENCES users(id)
    ON DELETE CASCADE;
