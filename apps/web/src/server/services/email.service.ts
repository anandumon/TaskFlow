import nodemailer from 'nodemailer'
import { getAppBaseUrl } from '../utils/url'

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
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Common responsive email layout wrapper ensuring perfect rendering across all devices:
 * iPhone, Android, Gmail App, Outlook, Webmail, Laptop, and PC.
 * Uses bulletproof tables, fluid 100% width with max-width 580px, and high-contrast inline colors.
 */
function wrapEmailHtml(title: string, contentHtml: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${escapeHtml(title)}</title>
  <style type="text/css">
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0c0817; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 620px) {
      .responsive-table { width: 100% !important; max-width: 100% !important; border-radius: 12px !important; }
      .content-padding { padding: 22px 16px !important; }
      .mobile-card-row { display: block !important; width: 100% !important; text-align: left !important; }
      .mobile-val { text-align: left !important; padding-top: 2px !important; padding-bottom: 10px !important; }
    }
  </style>
</head>
<body bgcolor="#0c0817" style="margin: 0; padding: 0; background-color: #0c0817; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#0c0817" style="width: 100%; margin: 0; padding: 24px 8px; background-color: #0c0817;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Card Container -->
        <table role="presentation" class="responsive-table" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%; margin: 0 auto; background: linear-gradient(145deg, #16102c 0%, #1c1538 100%); background-color: #16102c; border: 1px solid #4338ca; border-radius: 20px; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7); overflow: hidden;">
          <tr>
            <td class="content-padding" style="padding: 34px 30px; text-align: left;">
              <!-- Brand Header -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="left" valign="middle">
                    <span style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 10px; font-size: 20px; color: #ffffff; vertical-align: middle; margin-right: 10px;">⚡</span>
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff !important; letter-spacing: -0.5px; vertical-align: middle;">TaskFlow</span>
                  </td>
                </tr>
              </table>

              <!-- Main Dynamic Content -->
              ${contentHtml}

              <!-- Footer -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 28px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 18px;">
                <tr>
                  <td align="center" style="font-size: 11px; color: #64748b !important; line-height: 1.5; text-align: center;">
                    &copy; 2026 TaskFlow Inc. Automated security &amp; workspace notification.<br/>
                    Designed for peak collaboration and sprint velocity.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendEmailVerificationOtp(
  recipientEmail: string,
  recipientName: string,
  otp: string,
  expiryMinutes = 10
): Promise<boolean> {
  const safeName = escapeHtml(recipientName || 'there')
  const safeOtp = escapeHtml(otp)

  const content = `
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(99, 102, 241, 0.18); border: 1px solid #6366f1; color: #a5b4fc !important; margin-bottom: 16px;">
      ACCOUNT VERIFICATION
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      Verify your TaskFlow email
    </h1>
    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong style="color: #ffffff !important;">${safeName}</strong>, welcome to <strong>TaskFlow</strong>. Use the 6-digit verification code below to confirm your email address and activate your workspace:
    </p>

    <!-- OTP Box -->
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #211942; border: 1px solid #4f46e5; border-radius: 14px; margin: 24px 0; text-align: center;">
      <tr>
        <td style="padding: 24px 16px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #a5b4fc !important; margin-bottom: 8px;">VERIFICATION CODE</div>
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #818cf8 !important; margin: 8px 0;">${safeOtp}</div>
          <div style="display: inline-block; font-size: 11px; font-weight: 700; color: #fbbf24 !important; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.3); padding: 4px 12px; border-radius: 9999px; margin-top: 6px;">
            &#9201; Expires in ${expiryMinutes} minutes
          </div>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #94a3b8 !important; line-height: 1.6; margin: 0;">
      Please enter this code on the verification screen. If you did not create a TaskFlow account, you can safely disregard this email.
    </p>
  `

  const html = wrapEmailHtml('Verify your TaskFlow email address', content)

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
  loginUrl?: string
): Promise<boolean> {
  const safeName = escapeHtml(recipientName || 'there')
  const targetUrl = loginUrl || `${getAppBaseUrl()}/login`

  const content = `
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(52, 211, 153, 0.18); border: 1px solid #34d399; color: #34d399 !important; margin-bottom: 16px;">
      &#10003; VERIFICATION COMPLETE
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      Your Account is Ready!
    </h1>
    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 24px 0;">
      Hello <strong style="color: #ffffff !important;">${safeName}</strong>,<br/>
      Your email has been verified and your TaskFlow account is active. Welcome aboard!
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto;">
      <tr>
        <td align="center" bgcolor="#6366f1" style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; text-align: center;">
            Sign In to TaskFlow &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  const html = wrapEmailHtml('Account Created Successfully - Welcome to TaskFlow!', content)

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

/**
 * Task Due Date Alert Notification Email
 * Rendered with high contrast, crisp inline typography, and responsive table design so all card details
 * are 100% visible across phones, laptops, and PCs in both Gmail Dark and Light modes.
 */
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
  taskUrl?: string
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')
  const safeTitle = escapeHtml(taskTitle || 'Untitled Task')
  const safeProject = escapeHtml(projectName || 'Project')
  const safeWorkspace = escapeHtml(workspaceName || 'Workspace')
  const safeDue = escapeHtml(dueDate || 'Today')
  const targetUrl = taskUrl || `${getAppBaseUrl()}/app/tasks`

  const isOverdue = dueBanner.toLowerCase().includes('overdue') || dueBanner.toLowerCase().includes('past')
  const bannerBg = isOverdue ? 'rgba(239, 68, 68, 0.22)' : 'rgba(245, 158, 11, 0.22)'
  const bannerBorder = isOverdue ? '#ef4444' : '#f59e0b'
  const bannerColor = isOverdue ? '#f87171' : '#fbbf24'

  const content = `
    <!-- Urgency Status Badge -->
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: ${bannerBg}; border: 1px solid ${bannerBorder}; color: ${bannerColor} !important; margin-bottom: 16px;">
      🔔 ${escapeHtml(dueBanner)}
    </div>

    <!-- Task Headline -->
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      ${safeTitle}
    </h1>

    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong style="color: #ffffff !important;">${safeRecipient}</strong>, this is an automated due date alert for a task in <strong style="color: #ffffff !important;">${safeProject}</strong>.
    </p>

    <!-- High-Contrast Responsive Details Table (NO flexbox, 100% visible on dark/light Gmail) -->
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #211942; border: 1px solid #4f46e5; border-radius: 14px; margin: 20px 0 24px 0; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Task Name
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safeTitle}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Project
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safeProject}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Workspace
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safeWorkspace}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Due Date
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #fbbf24 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safeDue}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Time Remaining
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #f87171 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${escapeHtml(timeRemainingText)}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Status
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #38bdf8 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${escapeHtml(statusText)}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; width: 38%; text-align: left; vertical-align: top;">
          Priority
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #f472b6 !important; width: 62%; text-align: right; vertical-align: top;">
          ${escapeHtml(priorityText)}
        </td>
      </tr>
    </table>

    <!-- Call to Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto 8px auto;">
      <tr>
        <td align="center" bgcolor="#6366f1" style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; text-align: center;">
            View Task on Board &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  const html = wrapEmailHtml(`Task Due Alert: ${taskTitle}`, content)

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

/**
 * New Task Assignment Notification Email
 * Sent automatically when a new task is created and saved to the database.
 * Informs the assigned team member who assigned the task, the task name, project, priority, and due date.
 */
export async function sendTaskAssignedEmail(
  recipientEmail: string,
  recipientName: string,
  assignerName: string,
  taskTitle: string,
  projectName: string,
  workspaceName: string,
  dueDate: string,
  priorityText: string,
  description?: string,
  taskUrl?: string
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')
  const safeAssigner = escapeHtml(assignerName || 'A team member')
  const safeTitle = escapeHtml(taskTitle || 'Untitled Task')
  const safeProject = escapeHtml(projectName || 'Project')
  const safeWorkspace = escapeHtml(workspaceName || 'Workspace')
  const safeDue = escapeHtml(dueDate || 'Not set')
  const safePriority = escapeHtml(priorityText || 'Medium')
  const targetUrl = taskUrl || `${getAppBaseUrl()}/app/tasks`

  const priorityColor = safePriority.toLowerCase() === 'high' || safePriority.toLowerCase() === 'urgent'
    ? '#f87171'
    : safePriority.toLowerCase() === 'low'
    ? '#38bdf8'
    : '#fbbf24'

  const descBlock = description && description.trim()
    ? `<div style="background-color: #211942; border: 1px solid #4f46e5; border-radius: 12px; padding: 14px 16px; margin: 18px 0;">
         <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #a5b4fc !important; margin-bottom: 6px;">Task Description &amp; Scope</div>
         <div style="font-size: 13px; color: #ffffff !important; line-height: 1.6; word-break: break-word;">${escapeHtml(description)}</div>
       </div>`
    : ''

  const content = `
    <!-- Assignment Badge -->
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(99, 102, 241, 0.2); border: 1px solid #6366f1; color: #818cf8 !important; margin-bottom: 16px;">
      📋 NEW TASK ASSIGNED
    </div>

    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      ${safeTitle}
    </h1>

    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong style="color: #ffffff !important;">${safeRecipient}</strong>,<br/>
      You have been assigned a new task by <strong style="color: #ffffff !important;">${safeAssigner}</strong> in project <strong style="color: #ffffff !important;">${safeProject}</strong>.
    </p>

    <!-- Details Card (100% visible, high-contrast, responsive across all screens) -->
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #211942; border: 1px solid #4f46e5; border-radius: 14px; margin: 20px 0 22px 0; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Task Title
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safeTitle}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Project
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safeProject}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Assigned By
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #38bdf8 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safeAssigner}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Workspace
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safeWorkspace}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 38%; text-align: left; vertical-align: top;">
          Priority
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: ${priorityColor} !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 62%; text-align: right; vertical-align: top;">
          ${safePriority}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; width: 38%; text-align: left; vertical-align: top;">
          Due Date
        </td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #fbbf24 !important; width: 62%; text-align: right; vertical-align: top;">
          ${safeDue}
        </td>
      </tr>
    </table>

    ${descBlock}

    <!-- Call to Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto 8px auto;">
      <tr>
        <td align="center" bgcolor="#6366f1" style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; text-align: center;">
            Open Task on Board &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  const html = wrapEmailHtml(`New Task Assigned: ${taskTitle}`, content)

  try {
    await transporter.sendMail({
      from: `"TaskFlow Tasks" <${MAIL_USERNAME}>`,
      to: recipientEmail,
      subject: `📋 New Task Assigned: "${taskTitle}" in ${projectName}`,
      html,
    })
    console.log(`✔ [EMAIL] New task assigned email sent to: ${recipientEmail}`)
    return true
  } catch (err: any) {
    console.error(`⚠ [EMAIL] Failed to send new task assigned email:`, err?.message || err)
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
    ? `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #211942; border: 1px solid #4f46e5; border-radius: 14px; margin: 22px 0; text-align: center;">
         <tr>
           <td style="padding: 20px 16px; text-align: center;">
             <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #a5b4fc !important; margin-bottom: 6px;">Your Unique Referral / Invite Code</div>
             <div style="font-family: 'Courier New', Courier, monospace; font-size: 26px; font-weight: 800; letter-spacing: 4px; color: #818cf8 !important;">${safeCode}</div>
             <div style="font-size: 11px; color: #cbd5e1 !important; margin-top: 6px;">Click the button below or enter this code in TaskFlow to join directly.</div>
           </td>
         </tr>
       </table>`
    : ''

  const content = `
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(99, 102, 241, 0.2); border: 1px solid #6366f1; color: #818cf8 !important; margin-bottom: 16px;">
      PROJECT INVITATION
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      Join the team on TaskFlow
    </h1>
    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      <strong style="color: #ffffff !important;">${safeInviter}</strong> has invited you to collaborate on <strong style="color: #ffffff !important;">${safeProject}</strong> in workspace <strong style="color: #ffffff !important;">${safeWorkspace}</strong> (${safeOrg}).
    </p>

    ${codeBoxHtml}

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto;">
      <tr>
        <td align="center" bgcolor="#6366f1" style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; text-align: center;">
            Join Project &amp; Get Started &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  const html = wrapEmailHtml(`You've been invited to join ${projectName} on TaskFlow`, content)

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
  workspaceUrl?: string
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')
  const safeDate = escapeHtml(selectedDate)
  const targetUrl = workspaceUrl || `${getAppBaseUrl()}/app/tasks`

  const content = `
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(99, 102, 241, 0.2); border: 1px solid #6366f1; color: #818cf8 !important; margin-bottom: 16px;">
      📅 DATE DUE ALERT: ${safeDate}
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 10px 0; line-height: 1.3;">
      Due Date Alert: ${taskCount} Task(s) Due ${safeDate}
    </h1>
    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong style="color: #ffffff !important;">${safeRecipient}</strong>, here is your requested task due alert digest for <strong style="color: #ffffff !important;">${safeDate}</strong> across your active workspace.
    </p>

    <!-- Task List Items -->
    <div style="margin: 20px 0;">
      ${taskListHtml}
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto;">
      <tr>
        <td align="center" bgcolor="#6366f1" style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; text-align: center;">
            Open Tasks Board &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  const html = wrapEmailHtml(`TaskFlow Due Date Alert Digest (${safeDate})`, content)

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

  const content = `
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(99, 102, 241, 0.18); border: 1px solid #6366f1; color: #a5b4fc !important; margin-bottom: 16px;">
      🛡️ SECURITY NOTICE
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      New Sign-In Detected
    </h1>
    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong style="color: #ffffff !important;">${safeRecipient}</strong>,<br/>
      We detected a successful sign-in to your TaskFlow account.
    </p>

    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #211942; border: 1px solid #4f46e5; border-radius: 14px; margin: 18px 0 24px 0; border-collapse: separate;">
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 35%;">Device / Browser</td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: right;">${escapeHtml(deviceInfo)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; width: 35%;">Timestamp</td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; text-align: right;">${timeString}</td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #94a3b8 !important; line-height: 1.6; margin: 0;">
      If this was you, you can safely ignore this message. If you did not perform this login, please change your password immediately.
    </p>
  `

  const html = wrapEmailHtml('Security Notice: New Sign-in to TaskFlow', content)

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

  const content = `
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(251, 191, 36, 0.18); border: 1px solid #f59e0b; color: #fbbf24 !important; margin-bottom: 16px;">
      🔒 PASSWORD RESET
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      Reset Your Password
    </h1>
    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong style="color: #ffffff !important;">${safeRecipient}</strong>,<br/>
      We received a request to reset the password for your TaskFlow workspace account. Click the button below to choose a new password:
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto;">
      <tr>
        <td align="center" bgcolor="#6366f1" style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; text-align: center;">
            Set New Password &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #94a3b8 !important; line-height: 1.6; margin: 0;">
      This password reset link will expire in <strong>60 minutes</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.
    </p>
  `

  const html = wrapEmailHtml('Reset Your TaskFlow Password', content)

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
  calendarUrl?: string
): Promise<boolean> {
  const safeRecipient = escapeHtml(recipientName || 'there')
  const safeCalendar = escapeHtml(calendarEmail || 'Google Calendar')
  const targetUrl = calendarUrl || `${getAppBaseUrl()}/app/calendar`

  const content = `
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(16, 185, 129, 0.18); border: 1px solid #10b981; color: #34d399 !important; margin-bottom: 16px;">
      ✔ CALENDAR CONNECTED
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      Google Calendar Synced Successfully
    </h1>
    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong style="color: #ffffff !important;">${safeRecipient}</strong>,<br/>
      Your TaskFlow workspace has been synchronized with your Google Calendar account.
    </p>

    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #211942; border: 1px solid #4f46e5; border-radius: 14px; margin: 20px 0 24px 0; border-collapse: separate;">
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 45%;">Calendar Account</td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: right;">${safeCalendar}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 45%;">Google Events Synced</td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #38bdf8 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: right;">${eventCount}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 45%;">Tasks Added to Google</td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #818cf8 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: right;">${tasksExported}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1 !important; width: 45%;">Status</td>
        <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #34d399 !important; text-align: right;">Active &amp; Connected</td>
      </tr>
    </table>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto;">
      <tr>
        <td align="center" bgcolor="#6366f1" style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; text-align: center;">
            View Sprint Calendar &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  const html = wrapEmailHtml('Google Calendar Sync Successful', content)

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
  const targetUrl = `${getAppBaseUrl()}/login`

  const content = `
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(239, 68, 68, 0.18); border: 1px solid #ef4444; color: #f87171 !important; margin-bottom: 16px;">
      ORGANIZATION NOTICE
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff !important; margin: 0 0 12px 0; line-height: 1.3;">
      You have been removed from ${safeOrg}
    </h1>
    <p style="font-size: 14px; color: #cbd5e1 !important; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong style="color: #ffffff !important;">${safeName}</strong>,<br/><br/>
      ${safeAdmin} of <strong>${safeOrg}</strong> has removed you from the organization. You will no longer have access to its workspaces, projects, or tasks.
    </p>

    <div style="background-color: #211942; border: 1px solid #4f46e5; border-radius: 14px; padding: 18px 20px; margin: 20px 0; font-size: 13px; color: #cbd5e1 !important; line-height: 1.6;">
      • Any personal organizations or workspaces you created remain safe and accessible under your account.<br/>
      • If you do not have another active organization, you can sign in to TaskFlow at any time to create your own organization and workspace.
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto;">
      <tr>
        <td align="center" bgcolor="#6366f1" style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; text-align: center;">
            Sign In to TaskFlow &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  const html = wrapEmailHtml(`Removal Notice from ${safeOrg} on TaskFlow`, content)

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
