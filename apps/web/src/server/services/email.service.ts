import nodemailer from 'nodemailer'

const MAIL_USERNAME = process.env.MAIL_USERNAME || 'anandu2109@gmail.com'
const MAIL_PASSWORD = process.env.MAIL_PASSWORD || 'ebmqvzdkzxyabsij'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: MAIL_USERNAME,
    pass: MAIL_PASSWORD,
  },
})

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function sendEmailVerificationOtp(
  recipientEmail: string,
  recipientName: string,
  otp: string,
  expiryMinutes = 10
): Promise<boolean> {
  const safeName = escapeHtml(recipientName || 'there')
  const safeOtp = escapeHtml(otp)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify your TaskFlow email address</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
    .brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 10px; display: inline-block; text-align: center; line-height: 36px; color: #ffffff; font-size: 20px; font-weight: bold; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .greeting { font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }
    .description { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
    .otp-card { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 16px; padding: 24px; text-align: center; margin: 28px 0; }
    .otp-label { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #a5b4fc; margin-bottom: 10px; }
    .otp-code { font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #818cf8; margin: 8px 0; }
    .expiry-badge { display: inline-block; font-size: 11px; font-weight: 700; color: #fbbf24; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.25); padding: 4px 12px; border-radius: 9999px; }
    .footer { font-size: 11px; color: #4b5563; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-header">
      <div class="brand-icon">&#9889;</div>
      <div class="brand-title">TaskFlow</div>
    </div>
    <div class="greeting">Hello ${safeName},</div>
    <div class="description">
      Welcome to <strong>TaskFlow</strong>. Use the 6-digit verification code below to confirm your email address and activate your workspace:
    </div>
    <div class="otp-card">
      <div class="otp-label">Verification Code</div>
      <div class="otp-code">${safeOtp}</div>
      <div class="expiry-badge">&#9201; Expires in ${expiryMinutes} minutes</div>
    </div>
    <div class="description">
      Please enter this code on the verification screen. If you did not create a TaskFlow account, you can safely disregard this email.
    </div>
    <div class="footer">&copy; 2026 TaskFlow Inc. All rights reserved.</div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow Security" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: 'Verify your TaskFlow email address',
      html,
    })
    console.log(`✔ [EMAIL] OTP verification email sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send OTP email:`, err?.message || err)
    return false
  }
}

export async function sendAccountCreatedEmail(
  recipientEmail: string,
  recipientName: string,
  loginUrl = 'http://localhost:3000/login'
): Promise<boolean> {
  const safeName = escapeHtml(recipientName || 'there')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Account Created Successfully - TaskFlow</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 10px; display: inline-block; text-align: center; line-height: 36px; color: #ffffff; font-size: 20px; font-weight: bold; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .success-badge { display: inline-block; font-size: 12px; font-weight: 700; color: #34d399; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.3); padding: 6px 14px; border-radius: 9999px; margin-bottom: 18px; }
    .headline { font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 12px; }
    .description { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .btn-signin { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 36px; border-radius: 12px; }
    .footer { font-size: 11px; color: #475569; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-header">
      <div class="brand-icon">&#9889;</div>
      <div class="brand-title">TaskFlow</div>
    </div>
    <div class="success-badge">&#10003; Verification Complete</div>
    <div class="headline">Your Account is Ready!</div>
    <div class="description">
      Hello <strong>${safeName}</strong>,<br>
      Your email has been verified and your TaskFlow account is active. Welcome aboard!
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${loginUrl}" class="btn-signin">Sign In to TaskFlow &rarr;</a>
    </div>
    <div class="footer">&copy; 2026 TaskFlow Inc. All rights reserved.</div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow Security" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: 'Account Created Successfully - Welcome to TaskFlow!',
      html,
    })
    console.log(`✔ [EMAIL] Welcome email sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send welcome email:`, err?.message || err)
    return false
  }
}

export async function sendTaskDueAlertEmail(
  recipientEmail: string,
  recipientName: string,
  taskTitle: string,
  projectName: string,
  workspaceName: string,
  dueDate: string,
  timeRemainingText: string,
  dueBanner: string,
  statusText = 'In Progress',
  priorityText = 'High',
  taskUrl = 'http://localhost:3000/app/tasks'
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')
  const safeTitle = escapeHtml(taskTitle || 'Untitled Task')
  const safeProject = escapeHtml(projectName || 'Project')
  const safeWorkspace = escapeHtml(workspaceName || 'Workspace')
  const safeDue = escapeHtml(dueDate || 'Today')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Task Due Alert: ${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .status-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; margin-bottom: 16px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; text-transform: uppercase; }
    .heading { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }
    .card { background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin-bottom: 28px; }
    .card-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-header">
      <span style="font-size: 24px;">🔔</span>
      <span class="brand-title">TaskFlow</span>
    </div>
    <div class="status-badge">${escapeHtml(dueBanner)}</div>
    <h1 class="heading">${safeTitle}</h1>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">
      Hello <strong>${safeRecipient}</strong>, this is an automated due date alert for a task in <strong>${safeProject}</strong>.
    </p>
    <div class="card">
      <div class="card-row"><span>Task Name:</span><strong>${safeTitle}</strong></div>
      <div class="card-row"><span>Project:</span><strong>${safeProject}</strong></div>
      <div class="card-row"><span>Workspace:</span><strong>${safeWorkspace}</strong></div>
      <div class="card-row"><span>Due Date:</span><strong style="color: #f59e0b;">${safeDue}</strong></div>
      <div class="card-row"><span>Time Remaining:</span><strong>${escapeHtml(timeRemainingText)}</strong></div>
      <div class="card-row"><span>Status:</span><strong>${escapeHtml(statusText)}</strong></div>
      <div class="card-row"><span>Priority:</span><strong>${escapeHtml(priorityText)}</strong></div>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${taskUrl}" class="btn">View Task on Board &rarr;</a>
    </div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow Alerts" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: `🔔 ${dueBanner}: "${taskTitle}" in ${projectName}`,
      html,
    })
    console.log(`✔ [EMAIL] Task due alert sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send task due alert:`, err?.message || err)
    return false
  }
}

export async function sendProjectInvitationEmail(
  recipientEmail: string,
  inviterName: string,
  orgName: string,
  workspaceName: string,
  projectName: string,
  inviteUrl: string
): Promise<boolean> {
  const safeInviter = escapeHtml(inviterName || 'A team member')
  const safeOrg = escapeHtml(orgName || 'Organization')
  const safeWorkspace = escapeHtml(workspaceName || 'Workspace')
  const safeProject = escapeHtml(projectName || 'Project')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>You've been invited to join ${safeProject} on TaskFlow</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 20px; padding: 36px; }
    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-header">
      <span style="font-size: 24px;">⚡</span>
      <span class="brand-title">TaskFlow</span>
    </div>
    <h1 style="font-size: 20px; color: #ffffff;">Join the team on TaskFlow</h1>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">
      <strong>${safeInviter}</strong> has invited you to collaborate on <strong>${safeProject}</strong> in workspace <strong>${safeWorkspace}</strong> (${safeOrg}).
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${inviteUrl}" class="btn">Join Project &amp; Get Started &rarr;</a>
    </div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow Invitations" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: `You've been invited to join ${projectName} on TaskFlow`,
      html,
    })
    console.log(`✔ [EMAIL] Project invitation sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send invitation email:`, err?.message || err)
    return false
  }
}

export async function sendDateDueAlertDigestEmail(
  recipientEmail: string,
  recipientName: string,
  selectedDate: string,
  taskCount: number,
  taskListHtml: string,
  workspaceUrl = 'http://localhost:3000/app/tasks'
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')
  const safeDate = escapeHtml(selectedDate)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TaskFlow Due Date Alert Digest (${safeDate})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 580px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 24px; padding: 36px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .date-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; margin-bottom: 16px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; text-transform: uppercase; }
    .heading { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; }
    .description { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
    .task-card { background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 16px; margin-bottom: 12px; }
    .task-title { font-size: 15px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; }
    .task-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #94a3b8; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-header">
      <span style="font-size: 24px;">⚡</span>
      <span class="brand-title">TaskFlow</span>
    </div>
    <div class="date-badge">📅 DATE DUE ALERT: ${safeDate}</div>
    <h1 class="heading">Due Date Alert: ${taskCount} Task(s) Due ${safeDate}</h1>
    <p class="description">
      Hello <strong>${safeRecipient}</strong>, here is your requested task due alert digest for <strong>${safeDate}</strong> across your active workspace.
    </p>
    <div>
      ${taskListHtml}
    </div>
    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${workspaceUrl}" class="btn">Open Tasks Board &rarr;</a>
    </div>
    <div style="font-size: 11px; color: #64748b; margin-top: 24px;">&copy; 2026 TaskFlow Inc. All rights reserved.</div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow Alerts" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: `🔔 Due Date Alert Digest: ${taskCount} Task(s) Due ${selectedDate}`,
      html,
    })
    console.log(`✔ [EMAIL] Date due alert digest sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send date due alert digest:`, err?.message || err)
    return false
  }
}

export async function sendSignInNotificationEmail(
  recipientEmail: string,
  recipientName: string,
  deviceInfo = 'Web Browser'
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')
  const timeString = new Date().toUTCString()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Security Notice: New Sign-in to TaskFlow</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 20px; padding: 36px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .card { background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
      <span style="font-size: 24px;">🛡️</span>
      <span class="brand-title">TaskFlow Security</span>
    </div>
    <h1 style="font-size: 20px; color: #ffffff; margin-bottom: 12px;">New Sign-In Detected</h1>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">
      Hello <strong>${safeRecipient}</strong>,<br>
      We detected a successful sign-in to your TaskFlow account.
    </p>
    <div class="card">
      <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 6px;"><strong>Device:</strong> ${escapeHtml(deviceInfo)}</div>
      <div style="font-size: 13px; color: #e2e8f0;"><strong>Timestamp:</strong> ${timeString}</div>
    </div>
    <p style="font-size: 12px; color: #94a3b8;">
      If this was you, you can safely ignore this message. If you did not perform this login, please change your password immediately.
    </p>
    <div style="font-size: 11px; color: #475569; margin-top: 24px;">&copy; 2026 TaskFlow Inc. All rights reserved.</div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow Security" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: `🛡️ Security Alert: New Sign-in to TaskFlow`,
      html,
    })
    console.log(`✔ [EMAIL] Sign-in notification sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send sign-in notification:`, err?.message || err)
    return false
  }
}

