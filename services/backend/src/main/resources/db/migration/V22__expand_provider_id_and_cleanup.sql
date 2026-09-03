-- ============================================================
-- V22: Alter provider_id to TEXT to support OAuth subject tokens safely
--      and clean up test users except admin
-- ============================================================

ALTER TABLE users ALTER COLUMN provider_id TYPE TEXT;

DELETE FROM audit_logs 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM team_members 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

UPDATE teams 
SET created_by = NULL 
WHERE created_by IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM workspace_members 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM organization_members 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

UPDATE projects 
SET created_by = NULL 
WHERE created_by IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

UPDATE tasks 
SET created_by = NULL 
WHERE created_by IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

UPDATE tasks 
SET assignee_id = NULL 
WHERE assignee_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

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

DELETE FROM email_verification_otp 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM refresh_tokens 
WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@taskflow.dev');

DELETE FROM users WHERE email != 'admin@taskflow.dev';
