package com.taskflow.common.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Deprecated
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@taskflow.dev}")
    private String fromEmail;

    @Autowired(required = false)
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationOtp(String toEmail, String otpCode) {
        log.info("📧 [DISPATCHING EMAIL] Sending 6-digit OTP verification code to: {} | OTP: {} (Expires in 2 mins)", toEmail, otpCode);

        if (mailSender == null) {
            log.warn("⚠ JavaMailSender is not initialized. OTP code is logged above.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail.isEmpty() ? "noreply@taskflow.dev" : fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Your TaskFlow Verification Code: " + otpCode);

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 40px 20px; }
                    .container { max-width: 480px; margin: 0 auto; background-color: #161129; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                    .brand { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 24px; }
                    .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
                    .subtitle { font-size: 13px; color: #9ca3af; line-height: 1.5; margin-bottom: 24px; }
                    .otp-box { background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; }
                    .otp-code { font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #818cf8; }
                    .timer-badge { display: inline-block; font-size: 11px; font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.12); padding: 4px 10px; border-radius: 6px; margin-top: 8px; }
                    .footer { font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; margin-top: 24px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="brand">⚡ TaskFlow</div>
                    <div class="title">Verify your email address</div>
                    <div class="subtitle">Please enter the following 6-digit verification code to complete your TaskFlow account registration:</div>
                    <div class="otp-box">
                      <div class="otp-code">%s</div>
                      <div class="timer-badge">⏱ Valid for 2 minutes only</div>
                    </div>
                    <div class="subtitle">If you did not request this verification code, please disregard this email.</div>
                    <div class="footer">© 2026 TaskFlow Inc. Built for organizations worldwide.</div>
                  </div>
                </body>
                </html>
                """.formatted(otpCode);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("✔ Verification email successfully transmitted to SMTP gateway for {}", toEmail);
        } catch (Exception e) {
            log.warn("⚠ SMTP transmission failed: {} (Fallback: OTP is active and verified in-memory for 2 minutes: {})", e.getMessage(), otpCode);
        }
    }
}
