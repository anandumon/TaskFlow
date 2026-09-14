import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { verifyEmailOtp } from '@/server/services/auth.service'

export async function POST(req: NextRequest) {
  try {
    const { email, code, otp } = await req.json()
    const token = code || otp
    if (!email || !token) {
      return apiError('Email and verification code are required', 400)
    }

    const result = await verifyEmailOtp({
      email,
      otp: token,
    })

    return apiSuccess(result)
  } catch (err: any) {
    console.error('[API /auth/verify-email] Error:', err)
    return apiError(err?.message || 'Verification failed', 400, 'INVALID_OTP')
  }
}
