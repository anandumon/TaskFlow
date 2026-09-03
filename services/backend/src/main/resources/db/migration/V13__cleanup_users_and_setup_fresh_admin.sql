-- ============================================================
-- V13: Cleanup non-admin users and setup fresh Admin user in DB
-- ============================================================

-- Clean up any associated child records for non-admin users
DELETE FROM email_verification_otp 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM refresh_tokens 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM user_identity 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM calendar_sync_log 
WHERE connection_id IN (
    SELECT id FROM calendar_connection 
    WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev')
);

DELETE FROM calendar_event 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM external_calendar 
WHERE connection_id IN (
    SELECT id FROM calendar_connection 
    WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev')
);

DELETE FROM calendar_connection 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM workspace_members 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM organization_members 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

-- Remove all non-admin users
DELETE FROM users WHERE email != 'admin@taskflow.dev';

-- Ensure Admin User exists and is properly configured
UPDATE users 
SET 
    password_hash = crypt('Admin@TaskFlow2026!', gen_salt('bf', 10)),
    status = 'ACTIVE',
    email_verified = true,
    failed_login_attempts = 0,
    locked_until = NULL,
    deleted = false
WHERE email = 'admin@taskflow.dev';

INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    display_name,
    status,
    email_verified,
    auth_provider,
    created_at,
    updated_at,
    deleted
) 
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'admin@taskflow.dev',
    crypt('Admin@TaskFlow2026!', gen_salt('bf', 10)),
    'Admin',
    'User',
    'TaskFlow Admin',
    'ACTIVE',
    true,
    'LOCAL',
    NOW(),
    NOW(),
    false
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@taskflow.dev');
