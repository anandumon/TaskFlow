package com.taskflow.identity.email;

public interface EmailService {

    void sendEmailVerificationOtp(String recipientEmail, String recipientName, String otp);

    void sendEmailConfirmationLink(String recipientEmail, String recipientName, String confirmationUrl);
}
