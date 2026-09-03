package com.taskflow.identity.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.email-verification")
public class EmailVerificationProperties {

    private boolean enabled = true;
    private OtpProperties otp = new OtpProperties();

    @Data
    public static class OtpProperties {
        private int length = 6;
        private int expiryMinutes = 2;
        private int maxAttempts = 5;
        private int resendCooldownSeconds = 60;
        private int maxResendsPerHour = 5;
    }
}
