import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { resendVerificationOtp } from '@/server/services/auth.service'

export async function POST(req: NextRequest) {
  try {
    let email = ''
    try {
      const body = await req.json()
      email = body.email
    } catch {
      const { searchParams } = new URL(req.url)
      email = searchParams.get('email') || ''
    }

    if (!email) return apiError('Email is required', 400)

    await resendVerificationOtp(email)
    return apiSuccess({
      message: 'A fresh verification code has been sent to your inbox.',
      retryAfterSeconds: 60,
    })
  } catch (err: any) {
    console.error('[API /auth/resend-code] Error:', err)
    return apiError(err?.message || 'Failed to resend code', 400)
  }
}
