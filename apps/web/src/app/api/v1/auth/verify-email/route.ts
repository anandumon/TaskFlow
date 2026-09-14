import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { email, code, otp } = await req.json()
    const token = code || otp
    if (!email || !token) {
      return apiError('Email and verification code are required', 400)
    }

    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'signup',
    })

    if (error || !data.session) {
      return apiError(error?.message || 'Invalid or expired verification code', 400)
    }

    const u = data.user
    return apiSuccess({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: u ? {
        id: u.id,
        email: u.email,
        firstName: u.user_metadata?.first_name || '',
        lastName: u.user_metadata?.last_name || '',
        displayName: `${u.user_metadata?.first_name || ''} ${u.user_metadata?.last_name || ''}`.trim() || u.email,
        emailVerified: true,
      } : null,
    })
  } catch (err: any) {
    return apiError(err.message || 'Verification failed', 500)
  }
}
