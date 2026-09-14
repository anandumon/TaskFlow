import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { requestPasswordReset } from '@/server/services/auth.service'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return apiError('Email is required', 400)
    }

    const result = await requestPasswordReset(email)
    return apiSuccess({
      message: 'Password reset instructions have been sent to your email.',
      devToken: result.token,
    })
  } catch (err: any) {
    console.error('[API /auth/forgot-password] Error:', err)
    return apiError(err.message || 'Failed to process password reset request', 500)
  }
}
