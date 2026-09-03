-- ============================================================
-- V5: RBAC — Roles and Permissions
-- ============================================================

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN DEFAULT FALSE,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_org ON roles(organization_id);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(100) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) NOT NULL
);

CREATE TABLE role_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- ── Add FK from org_members and ws_members to roles ─────────
ALTER TABLE organization_members
    ADD CONSTRAINT fk_org_members_role FOREIGN KEY (role_id) REFERENCES roles(id);

ALTER TABLE workspace_members
    ADD CONSTRAINT fk_ws_members_role FOREIGN KEY (role_id) REFERENCES roles(id);

ALTER TABLE organization_invitations
    ADD CONSTRAINT fk_org_invitations_role FOREIGN KEY (role_id) REFERENCES roles(id);
