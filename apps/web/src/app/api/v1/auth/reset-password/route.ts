import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { performPasswordReset } from '@/server/services/auth.service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = body.token
    const newPassword = body.newPassword || body.password

    if (!token || !newPassword) {
      return apiError('Token and new password are required', 400)
    }

    await performPasswordReset(token, newPassword)
    return apiSuccess({
      message: 'Your password has been successfully reset. You can now sign in.',
    })
  } catch (err: any) {
    console.error('[API /auth/reset-password] Error:', err)
    return apiError(err.message || 'Failed to reset password', 400)
  }
}
