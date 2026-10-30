/**
 * Production-ready application base URL resolver.
 * Ensures external links (such as invitation and notification emails)
 * always resolve to the valid live production domain (https://task-flow-seven-ochre.vercel.app).
 */
export function getAppBaseUrl(): string {
  // 1. Explicit production URL configured by user or Vercel (excluding localhost)
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }

  // 2. Vercel System Production Domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}`
  }

  // 3. Vercel General Deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }

  // 4. Next.js Public Site URL
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }

  // 5. Default to the live TaskFlow production URL for all notifications, invites, and emails
  return 'https://task-flow-seven-ochre.vercel.app'
}
