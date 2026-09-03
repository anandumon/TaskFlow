-- ============================================================
-- V15: Cleanup all users except admin
-- ============================================================

-- Audit logs
DELETE FROM audit_logs 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

-- Team memberships and team references
DELETE FROM team_members 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

UPDATE teams 
SET created_by = NULL 
WHERE created_by IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

-- Workspace & organization memberships
DELETE FROM workspace_members 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM organization_members 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

-- Projects and Tasks references
UPDATE projects 
SET created_by = NULL 
WHERE created_by IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

UPDATE tasks 
SET created_by = NULL 
WHERE created_by IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

UPDATE tasks 
SET assignee_id = NULL 
WHERE assignee_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

-- Calendar and user identity
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

DELETE FROM user_identity 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

-- Auth tokens & OTPs
DELETE FROM email_verification_otp 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM refresh_tokens 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

-- Remove all non-admin users
DELETE FROM users WHERE email != 'admin@taskflow.dev';

-- Ensure Admin User exists, is active, and verified
UPDATE users 
SET 
    status = 'ACTIVE',
    email_verified = true,
    failed_login_attempts = 0,
    locked_until = NULL,
    deleted = false
WHERE email = 'admin@taskflow.dev';
