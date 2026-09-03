package com.taskflow.identity.entity;

public enum OtpStatus {
    ACTIVE,
    VERIFIED,
    EXPIRED,
    MAX_ATTEMPTS_EXCEEDED,
    REPLACED
}
