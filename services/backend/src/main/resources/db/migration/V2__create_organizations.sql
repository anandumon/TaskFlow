-- ============================================================
-- V2: Organizations and membership
-- ============================================================

CREATE TABLE organizations (
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

CREATE UNIQUE INDEX idx_orgs_slug ON organizations(slug) WHERE deleted = false;
CREATE INDEX idx_orgs_owner ON organizations(owner_id);

-- ── Organization Members ─────────────────────────────────────
CREATE TABLE organization_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID,  -- FK added after roles table is created
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_org_members_unique ON organization_members(organization_id, user_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);

-- ── Organization Invitations ─────────────────────────────────
CREATE TABLE organization_invitations (
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

CREATE INDEX idx_org_invitations_org ON organization_invitations(organization_id);
CREATE INDEX idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX idx_org_invitations_token ON organization_invitations(token);
