/**
 * Production-ready application base URL resolver.
 * Ensures external links (such as invitation and notification emails)
 * never fallback to localhost:3000 in deployed or production environments.
 */
export function getAppBaseUrl(): string {
  // 1. Explicit environment variable configured by user or Vercel
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

  // 5. If running in production or on cloud hosting, default to the live TaskFlow app domain
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return 'https://task-flow-seven-ochre.vercel.app'
  }

  // 6. Local development fallback
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
}
