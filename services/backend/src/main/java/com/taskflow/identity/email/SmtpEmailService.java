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

    @Value("${spring.mail.username:anandu2109@gmail.com}")
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

    private String getSenderEmail() {
        if (fromEmail != null && !fromEmail.isBlank() && !fromEmail.contains("noreply")) {
            return fromEmail.trim();
        }
        return "anandu2109@gmail.com";
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

            String sender = getSenderEmail();
            helper.setFrom(sender, "TaskFlow Security");
            helper.setTo(recipientEmail);
            helper.setSubject("Verify your TaskFlow email address");

            String htmlBody = emailTemplateService.renderVerificationTemplate(recipientName, otp, expiryMinutes);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Verification email successfully transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.error("⚠ [EMAIL DISPATCH] SMTP transmission failed: {} (Fallback: OTP is active for 2 mins: {})",
                    e.getMessage(), otp, e);
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

            String sender = getSenderEmail();
            helper.setFrom(sender, "TaskFlow");
            helper.setTo(recipientEmail);
            helper.setSubject("Confirm your email address - TaskFlow");

            String htmlBody = emailTemplateService.renderConfirmationLinkTemplate(recipientName, confirmationUrl);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Confirmation link successfully transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.error("⚠ [EMAIL DISPATCH] SMTP confirmation transmission failed: {}", e.getMessage(), e);
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

            String sender = getSenderEmail();
            helper.setFrom(sender, "TaskFlow");
            helper.setTo(recipientEmail);
            helper.setSubject("Account Created Successfully - Welcome to TaskFlow!");

            String htmlBody = emailTemplateService.renderAccountCreatedTemplate(recipientName, loginUrl);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Account creation success email transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.error("⚠ [EMAIL DISPATCH] Failed to transmit account creation success email to {}: {}",
                    maskedEmail, e.getMessage(), e);
        }
    }

    @Async
    @Override
    public void sendProjectInvitationEmail(String recipientEmail, String inviterName, String orgName, String workspaceName, String projectName, String inviteUrl) {
        String maskedEmail = maskEmail(recipientEmail);

        log.info("\n" +
                "======================================================================\n" +
                "📩 [TASKFLOW EMAIL DISPATCH] PROJECT INVITATION\n" +
                "To           : {}\n" +
                "Invited By   : {}\n" +
                "Project      : {}\n" +
                "Workspace    : {}\n" +
                "Organization : {}\n" +
                "Invite Link  : {}\n" +
                "======================================================================",
                recipientEmail, inviterName, projectName, workspaceName, orgName, inviteUrl);

        if (mailSender == null) {
            log.info("ℹ Local mode: JavaMailSender bean unavailable. Click or copy the Invite Link logged above to join.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = getSenderEmail();
            helper.setFrom(sender, "TaskFlow");
            helper.setTo(recipientEmail);
            helper.setSubject("You've been invited to join " + projectName + " on TaskFlow");

            String htmlBody = emailTemplateService.renderProjectInvitationTemplate(inviterName, orgName, workspaceName, projectName, inviteUrl);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Project invitation email transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.error("⚠ [EMAIL DISPATCH] Failed to transmit project invitation email to {}: {}",
                    maskedEmail, e.getMessage(), e);
        }
    }

    @Async
    @Override
    public void sendTaskDueAlertEmail(String recipientEmail, String recipientName, String taskTitle, String projectName,
                                     String workspaceName, String dueDate, String timeRemainingText, String dueBanner,
                                     String badgeClass, String statusText, String priorityText, String taskUrl) {
        String maskedEmail = maskEmail(recipientEmail);

        log.info("\n" +
                "======================================================================\n" +
                "🔔 [TASKFLOW EMAIL DISPATCH] TASK DUE ALERT\n" +
                "To             : {}\n" +
                "Recipient      : {}\n" +
                "Task Title     : {}\n" +
                "Project        : {}\n" +
                "Workspace      : {}\n" +
                "Due Date       : {}\n" +
                "Time Remaining : {}\n" +
                "Alert Banner   : {}\n" +
                "Task URL       : {}\n" +
                "======================================================================",
                recipientEmail, recipientName, taskTitle, projectName, workspaceName, dueDate, timeRemainingText, dueBanner, taskUrl);

        if (mailSender == null) {
            log.info("ℹ Local mode: JavaMailSender bean unavailable. Due alert logged above.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = getSenderEmail();
            helper.setFrom(sender, "TaskFlow Alerts");
            helper.setTo(recipientEmail);
            helper.setSubject("🔔 " + dueBanner + ": \"" + taskTitle + "\" in " + projectName);

            String htmlBody = emailTemplateService.renderTaskDueAlertTemplate(
                    recipientName, taskTitle, projectName, workspaceName,
                    dueDate, timeRemainingText, dueBanner, badgeClass,
                    statusText, priorityText, taskUrl
            );
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Task due alert email transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.error("⚠ [EMAIL DISPATCH] Failed to transmit task due alert email to {}: {}",
                    maskedEmail, e.getMessage(), e);
        }
    }

    @Async
    @Override
    public void sendDateDueAlertDigestEmail(String recipientEmail, String recipientName, String selectedDate,
                                           int taskCount, String taskListHtml, String workspaceUrl) {
        String maskedEmail = maskEmail(recipientEmail);

        log.info("\n" +
                "======================================================================\n" +
                "🔔 [TASKFLOW EMAIL DISPATCH] DATE DUE ALERT DIGEST\n" +
                "To             : {}\n" +
                "Recipient      : {}\n" +
                "Selected Date  : {}\n" +
                "Task Count     : {}\n" +
                "Workspace URL  : {}\n" +
                "======================================================================",
                recipientEmail, recipientName, selectedDate, taskCount, workspaceUrl);

        if (mailSender == null) {
            log.info("ℹ Local mode: JavaMailSender bean unavailable. Date due alert digest logged above.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = getSenderEmail();
            helper.setFrom(sender, "TaskFlow Alerts");
            helper.setTo(recipientEmail);
            helper.setSubject("🔔 Due Date Alert Digest: " + taskCount + " Task(s) Due " + selectedDate);

            String htmlBody = emailTemplateService.renderDateDueAlertDigestTemplate(
                    recipientName, selectedDate, taskCount, taskListHtml, workspaceUrl
            );
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✔ [EMAIL DISPATCH] Date due alert digest email transmitted via SMTP for: {}", maskedEmail);
        } catch (Exception e) {
            log.error("⚠ [EMAIL DISPATCH] Failed to transmit date due alert digest email to {}: {}",
                    maskedEmail, e.getMessage(), e);
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
