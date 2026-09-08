-- ============================================================
-- V28: Add auth_user_id to users to link with Supabase auth.users
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE deleted = false;
