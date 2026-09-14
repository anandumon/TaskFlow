package com.taskflow.identity.email;

public interface EmailService {

    void sendEmailVerificationOtp(String recipientEmail, String recipientName, String otp);

    void sendEmailConfirmationLink(String recipientEmail, String recipientName, String confirmationUrl);

    void sendAccountCreationSuccessEmail(String recipientEmail, String recipientName);

    void sendProjectInvitationEmail(String recipientEmail, String inviterName, String orgName, String workspaceName, String projectName, String inviteUrl);
 
     void sendTaskDueAlertEmail(String recipientEmail, String recipientName, String taskTitle, String projectName,
                                String workspaceName, String dueDate, String timeRemainingText, String dueBanner,
                                String badgeClass, String statusText, String priorityText, String taskUrl);

     void sendDateDueAlertDigestEmail(String recipientEmail, String recipientName, String selectedDate,
                                      int taskCount, String taskListHtml, String workspaceUrl);
}
