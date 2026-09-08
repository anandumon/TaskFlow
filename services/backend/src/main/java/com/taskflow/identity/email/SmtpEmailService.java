package com.taskflow.identity.email;

import com.taskflow.common.service.EmailTemplateService;
import com.taskflow.identity.config.EmailVerificationProperties;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class SmtpEmailService implements EmailService {

    private final JavaMailSender mailSender;
    private final EmailTemplateService emailTemplateService;
    private final EmailVerificationProperties emailVerificationProperties;

    @Value("${spring.mail.username:noreply@taskflow.dev}")
    private String fromEmail;

    @Value("${taskflow.app.url:http://localhost:3000}")
    private String appUrl;

    @Autowired
    public SmtpEmailService(@Autowired(required = false) JavaMailSender mailSender,
                            EmailTemplateService emailTemplateService,
                            EmailVerificationProperties emailVerificationProperties) {
        this.mailSender = mailSender;
        this.emailTemplateService = emailTemplateService;
        this.emailVerificationProperties = emailVerificationProperties;
    }

    @Async
    @Override
    public void sendEmailVerificationOtp(String recipientEmail, String recipientName, String otp) {
        String maskedEmail = maskEmail(recipientEmail);
        int expiryMinutes = emailVerificationProperties.getOtp().getExpiryMinutes();

        log.info("\n" +
                "======================================================================\n" +
                "🔐 [TASKFLOW EMAIL DISPATCH] 6-DIGIT VERIFICATION OTP\n" +
                "To        : {}\n" +
                "OTP Code  : {}\n" +
                "Expires In: {} minutes\n" +
                "======================================================================",
                recipientEmail, otp, expiryMinutes);

        if (mailSender == null) {
            log.info("ℹ Local mode: JavaMailSender bean unavailable. Use the 6-digit OTP logged above for verification.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "noreply@taskflow.dev";
            helper.setFrom(sender, "TaskFlow Security");
            helper.setTo(recipientEmail);
            helper.setSubject("Verify your TaskFlow email address");

            String htmlBody = emailTemplateService.renderVerificationTemplate(recipientName, otp, expiryMinutes);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Verification email successfully transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.warn("⚠ [EMAIL DISPATCH] SMTP server unavailable ({}). Use the 6-digit OTP code logged above to complete verification.",
                    e.getMessage());
        }
    }

    @Async
    @Override
    public void sendEmailConfirmationLink(String recipientEmail, String recipientName, String confirmationUrl) {
        String maskedEmail = maskEmail(recipientEmail);

        log.info("\n" +
                "======================================================================\n" +
                "📧 [TASKFLOW CONFIRMATION EMAIL DISPATCH]\n" +
                "To               : {}\n" +
                "Confirmation Link: {}\n" +
                "======================================================================",
                recipientEmail, confirmationUrl);

        if (mailSender == null) {
            log.info("ℹ Local mode: Click or copy the Confirmation Link logged above to verify.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "noreply@taskflow.dev";
            helper.setFrom(sender, "TaskFlow");
            helper.setTo(recipientEmail);
            helper.setSubject("Confirm your email address - TaskFlow");

            String htmlBody = emailTemplateService.renderConfirmationLinkTemplate(recipientName, confirmationUrl);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Confirmation link successfully transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.warn("⚠ [EMAIL DISPATCH] SMTP server unavailable ({}). Use the confirmation link logged above to complete verification.",
                    e.getMessage());
        }
    }

    @Async
    @Override
    public void sendAccountCreationSuccessEmail(String recipientEmail, String recipientName) {
        String maskedEmail = maskEmail(recipientEmail);
        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl : "http://localhost:3000";
        String loginUrl = baseUrl + "/login?email=" + recipientEmail + "&verified=true";

        log.info("\n" +
                "======================================================================\n" +
                "🎉 [TASKFLOW EMAIL DISPATCH] ACCOUNT CREATION SUCCESSFUL\n" +
                "To        : {}\n" +
                "Recipient : {}\n" +
                "Login URL : {}\n" +
                "======================================================================",
                recipientEmail, recipientName, loginUrl);

        if (mailSender == null) {
            log.info("ℹ Local mode: JavaMailSender bean unavailable.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "noreply@taskflow.dev";
            helper.setFrom(sender, "TaskFlow");
            helper.setTo(recipientEmail);
            helper.setSubject("Account Created Successfully - Welcome to TaskFlow!");

            String htmlBody = emailTemplateService.renderAccountCreatedTemplate(recipientName, loginUrl);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Account creation success email transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.warn("⚠ [EMAIL DISPATCH] Failed to transmit account creation success email to {}: {}",
                    maskedEmail, e.getMessage());
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "unknown";
        String[] parts = email.split("@");
        String name = parts[0];
        String domain = parts[1];
        if (name.length() <= 2) {
            return name.charAt(0) + "***@" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + "@" + domain;
    }
}
