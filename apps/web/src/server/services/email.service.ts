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
  inviteUrl: string,
  referralCode?: string
): Promise<boolean> {
  const safeInviter = escapeHtml(inviterName || 'A team member')
  const safeOrg = escapeHtml(orgName || 'Organization')
  const safeWorkspace = escapeHtml(workspaceName || 'Workspace')
  const safeProject = escapeHtml(projectName || 'Project')
  const safeCode = escapeHtml(referralCode || '')

  const codeBoxHtml = safeCode
    ? `<div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 14px; padding: 18px 20px; text-align: center; margin: 24px 0;">
         <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #a5b4fc; margin-bottom: 6px;">Your Unique Invitation / Referral Code</div>
         <div style="font-family: monospace; font-size: 26px; font-weight: 800; letter-spacing: 4px; color: #818cf8;">${safeCode}</div>
         <div style="font-size: 11px; color: #9ca3af; margin-top: 6px;">You can click the button below or enter this code in TaskFlow to join directly.</div>
       </div>`
    : ''

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
    ${codeBoxHtml}
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
      subject: `🔔 Task Due Date & Overdue Alert Digest: ${taskCount} Task(s)`,
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

export async function sendPasswordResetEmail(
  recipientEmail: string,
  recipientName: string,
  resetUrl: string
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Your TaskFlow Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 10px; display: inline-block; text-align: center; line-height: 36px; color: #ffffff; font-size: 20px; font-weight: bold; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .security-badge { display: inline-block; font-size: 11px; font-weight: 700; color: #fbbf24; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.25); padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
    .headline { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px; }
    .description { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4); }
    .footer { font-size: 11px; color: #4b5563; text-align: center; margin-top: 28px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-header">
      <div class="brand-icon">⚡</div>
      <div class="brand-title">TaskFlow</div>
    </div>
    <div class="security-badge">🔒 Password Reset Request</div>
    <div class="headline">Reset Your Password</div>
    <div class="description">
      Hello <strong>${safeRecipient}</strong>,<br>
      We received a request to reset the password for your TaskFlow workspace account. Click the button below to choose a new password:
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" class="btn">Set New Password &rarr;</a>
    </div>
    <div class="description" style="font-size: 12px; color: #6b7280;">
      This password reset link will expire in <strong>60 minutes</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.
    </div>
    <div class="footer">&copy; 2026 TaskFlow Inc. All rights reserved.</div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow Security" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: '🔐 Reset your TaskFlow password',
      html,
    })
    console.log(`✔ [EMAIL] Password reset link sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send password reset email:`, err?.message || err)
    return false
  }
}

export async function sendCalendarSyncNotificationEmail(
  recipientEmail: string,
  recipientName: string,
  calendarEmail: string,
  eventCount: number,
  tasksExported = 0,
  calendarUrl = 'http://localhost:3000/app/calendar'
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')
  const safeCalendar = escapeHtml(calendarEmail || 'Google Calendar')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Google Calendar Sync Successful</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .success-badge { display: inline-block; font-size: 11px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
    .headline { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px; }
    .description { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
    .card { background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin: 20px 0; }
    .card-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .btn { display: inline-block; background: linear-gradient(135deg, #00638e, #004a6b); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 36px; border-radius: 12px; }
    .footer { font-size: 11px; color: #4b5563; text-align: center; margin-top: 28px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-header">
      <span style="font-size: 24px;">📅</span>
      <span class="brand-title">TaskFlow Calendar</span>
    </div>
    <div class="success-badge">✔ Calendar Connected &amp; Synced</div>
    <div class="headline">Google Calendar Synced Successfully</div>
    <div class="description">
      Hello <strong>${safeRecipient}</strong>,<br>
      Your TaskFlow workspace has been synchronized with your Google Calendar account.
    </div>
    <div class="card">
      <div class="card-row"><span>Calendar Account:</span><strong>${safeCalendar}</strong></div>
      <div class="card-row"><span>Google Events Synced:</span><strong style="color: #38bdf8;">${eventCount}</strong></div>
      <div class="card-row"><span>TaskFlow Tasks Added to Google:</span><strong style="color: #818cf8;">${tasksExported}</strong></div>
      <div class="card-row"><span>Status:</span><strong style="color: #34d399;">Active &amp; Connected</strong></div>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${calendarUrl}" class="btn">View Sprint Calendar &rarr;</a>
    </div>
    <div class="footer">&copy; 2026 TaskFlow Inc. All rights reserved.</div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow Calendar" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: `📅 Google Calendar Connected: ${eventCount} Events Synced${tasksExported > 0 ? `, ${tasksExported} Tasks Added` : ''}`,
      html,
    })
    console.log(`✔ [EMAIL] Calendar sync email sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send calendar sync email:`, err?.message || err)
    return false
  }
}

export async function sendMemberRemovedEmail(
  recipientEmail: string,
  recipientName: string,
  orgName: string,
  adminName?: string
): Promise<boolean> {
  const safeName = escapeHtml(recipientName || 'there')
  const safeOrg = escapeHtml(orgName || 'Organization')
  const safeAdmin = escapeHtml(adminName || 'The admin or owner')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Removal Notice from ${safeOrg} on TaskFlow</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0817; color: #f3f4f6; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #161129 0%, #1a1435 100%); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
    .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 9999px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px; }
    .desc { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
    .card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px; margin: 20px 0; }
    .btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 12px; }
    .footer { font-size: 11px; color: #6b7280; text-align: center; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-header">
      <span style="font-size: 24px;">⚡</span>
      <span class="brand-title">TaskFlow</span>
    </div>
    <div class="badge">Organization Update</div>
    <h1 class="title">You have been removed from ${safeOrg}</h1>
    <p class="desc">
      Hello ${safeName},<br/><br/>
      ${safeAdmin} of <strong>${safeOrg}</strong> has removed you from the organization. You will no longer have access to its workspaces, projects, or tasks.
    </p>
    <div class="card">
      <div style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
        • Any personal organizations or workspaces you created remain safe and accessible under your account.<br/>
        • If you do not have another active organization, you can sign in to TaskFlow at any time to create your own organization and workspace.
      </div>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="https://task-flow-seven-ochre.vercel.app/login" class="btn">Sign In to TaskFlow &rarr;</a>
    </div>
    <div class="footer">
      If you believe this was done in error, please contact the administrator of ${safeOrg}.
    </div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"TaskFlow" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: `Notice: You have been removed from ${safeOrg} on TaskFlow`,
      html,
    })
    console.log(`✔ [EMAIL] Member removed notification sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send member removed email:`, err?.message || err)
    return false
  }
}



