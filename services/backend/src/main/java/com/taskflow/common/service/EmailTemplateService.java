package com.taskflow.common.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class EmailTemplateService {

    private final Map<String, String> templateCache = new ConcurrentHashMap<>();

    public String renderConfirmationLinkTemplate(String recipientName, String confirmationUrl) {
        String safeName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "there";
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Confirm your email address</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0817; color: #ffffff; padding: 40px 20px; margin: 0;">
              <div style="max-width: 520px; margin: 0 auto; background-color: #161129; padding: 40px 32px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: center;">
                <div style="display: inline-block; width: 50px; height: 50px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 16px; line-height: 50px; font-size: 24px; font-weight: 900; color: #ffffff; margin-bottom: 20px;">TF</div>
                
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 12px 0; letter-spacing: -0.02em;">Confirm your email address</h1>
                
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0;">
                  Hello <strong style="color: #ffffff;">{{name}}</strong>,<br>
                  Follow the link below to confirm this email address and finish setting up your TaskFlow account.
                </p>
                
                <div style="margin: 32px 0;">
                  <a href="{{confirmationUrl}}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 16px rgba(99,102,241,0.4); letter-spacing: 0.01em;">
                    Confirm email address
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 32px 0 0 0; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px;">
                  If button doesn't work, copy and paste this link in your browser:<br>
                  <a href="{{confirmationUrl}}" style="color: #818cf8; word-break: break-all; font-size: 11px;">{{confirmationUrl}}</a>
                </p>
                
                <p style="color: #475569; font-size: 11px; margin: 16px 0 0 0;">
                  If you didn't create a TaskFlow account, you can safely ignore this email.
                </p>
              </div>
            </body>
            </html>
            """;
        return template
                .replace("{{name}}", escapeHtml(safeName))
                .replace("{{confirmationUrl}}", confirmationUrl);
    }

    public String renderVerificationTemplate(String recipientName, String otp, int expiryMinutes) {
        String template = loadTemplate("templates/email/verification.html");
        String safeName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "there";
        return template
                .replace("{{name}}", escapeHtml(safeName))
                .replace("{{otp}}", escapeHtml(otp))
                .replace("{{expiryMinutes}}", String.valueOf(expiryMinutes));
    }

    private String loadTemplate(String templatePath) {
        return templateCache.computeIfAbsent(templatePath, path -> {
            try {
                ClassPathResource resource = new ClassPathResource(path);
                try (InputStream inputStream = resource.getInputStream()) {
                    return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
                }
            } catch (Exception e) {
                log.warn("Could not load template from {}: {}. Using fallback HTML layout.", path, e.getMessage());
                return getFallbackVerificationTemplate();
            }
        });
    }

    private String getFallbackVerificationTemplate() {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: sans-serif; background: #0c0817; color: #fff; padding: 20px;">
              <div style="max-width: 500px; margin: 0 auto; background: #161129; padding: 30px; border-radius: 16px;">
                <h2>TaskFlow Email Verification</h2>
                <p>Hello {{name}},</p>
                <p>Please click the confirmation link in your email to activate your account.</p>
              </div>
            </body>
            </html>
            """;
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }
}
