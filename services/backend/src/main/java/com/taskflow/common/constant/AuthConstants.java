package com.taskflow.common.constant;

public final class AuthConstants {
    private AuthConstants() {}

    public static final int PASSWORD_MIN_LENGTH = 8;
    public static final int PASSWORD_MAX_LENGTH = 128;
    public static final int OTP_CODE_LENGTH = 6;
    public static final long OTP_EXPIRATION_SECONDS = 900L; // 15 minutes
    public static final String OTP_CACHE_PREFIX = "email_otp:";
}
