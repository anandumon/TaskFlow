-- V11: Create email verification OTP table for secure multi-tenant authentication
CREATE TABLE IF NOT EXISTS email_verification_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    resend_count INT NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indices for rapid lookup of active OTPs and scheduled expiration cleanup
CREATE INDEX IF NOT EXISTS idx_email_verification_otp_user_status ON email_verification_otp(user_id, status);
CREATE INDEX IF NOT EXISTS idx_email_verification_otp_expires_at ON email_verification_otp(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_otp_status ON email_verification_otp(status);
