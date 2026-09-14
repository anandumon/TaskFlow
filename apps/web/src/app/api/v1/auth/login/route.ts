import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return apiError('Email and password are required', 400)
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error || !data.session) {
      return apiError(error?.message || 'Invalid email or password', 401, 'BAD_CREDENTIALS')
    }

    const u = data.user
    return apiSuccess({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      tokenType: 'Bearer',
      expiresIn: data.session.expires_in,
      user: {
        id: u.id,
        email: u.email,
        firstName: u.user_metadata?.first_name || '',
        lastName: u.user_metadata?.last_name || '',
        displayName: `${u.user_metadata?.first_name || ''} ${u.user_metadata?.last_name || ''}`.trim() || u.email,
        emailVerified: !!u.email_confirmed_at,
      },
    })
  } catch (err: any) {
    return apiError(err.message || 'Login failed', 500)
  }
}
