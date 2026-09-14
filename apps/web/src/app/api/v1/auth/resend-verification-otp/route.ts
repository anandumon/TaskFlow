import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return apiError('Email is required', 400)

    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    })

    if (error) {
      return apiError(error.message, 400)
    }

    return apiSuccess({ message: 'Verification code resent successfully' })
  } catch (err: any) {
    return apiError(err.message || 'Failed to resend code', 500)
  }
}
