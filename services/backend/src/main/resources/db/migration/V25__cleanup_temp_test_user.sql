-- ============================================================
-- V25: Clean up temporary test users only
-- ============================================================

DELETE FROM audit_logs 
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@taskflow.dev' AND email != 'admin@taskflow.dev');

DELETE FROM organization_members 
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@taskflow.dev' AND email != 'admin@taskflow.dev');

DELETE FROM users 
WHERE email LIKE '%@taskflow.dev' AND email != 'admin@taskflow.dev';
