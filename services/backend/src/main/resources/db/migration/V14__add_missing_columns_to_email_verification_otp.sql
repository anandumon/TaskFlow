-- ============================================================
-- V14: Add missing deleted and version columns to email_verification_otp
-- ============================================================

ALTER TABLE email_verification_otp 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE email_verification_otp 
ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
