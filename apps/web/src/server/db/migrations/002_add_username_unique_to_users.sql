-- =============================================================================
-- Migration: 002_add_username_unique_to_users.sql
-- Description: Adds a unique username column to users table, backfills existing
--              records with sanitized usernames, and adds a unique case-insensitive index.
-- =============================================================================

-- 1. Add username column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- 2. Populate existing users with clean usernames derived from email prefix or first name
UPDATE users 
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
WHERE username IS NULL OR username = '';

-- Fallback for any user where split resulted in empty string
UPDATE users
SET username = LOWER(REGEXP_REPLACE(first_name, '[^a-zA-Z0-9_]', '', 'g'))
WHERE username IS NULL OR username = '';

UPDATE users
SET username = 'user_' || SUBSTRING(id::text, 1, 8)
WHERE username IS NULL OR username = '';

-- 3. Disambiguate any duplicate usernames among existing rows
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT id, username, ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY created_at) as rn
        FROM users
    ) LOOP
        IF r.rn > 1 THEN
            UPDATE users SET username = r.username || '_' || r.rn WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- 4. Create unique case-insensitive index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (LOWER(username)) WHERE (deleted = false OR deleted IS NULL);
