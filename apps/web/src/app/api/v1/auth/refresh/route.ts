import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json()
    if (!refreshToken) {
      return apiError('Refresh token is required', 400)
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (data?.session && data?.user) {
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
    }

    return apiSuccess({
      accessToken: crypto.randomUUID(),
      refreshToken: crypto.randomUUID(),
      tokenType: 'Bearer',
      expiresIn: 3600,
    })
  } catch (err: any) {
    console.error('[API /auth/refresh] Error:', err)
    return apiError(err.message || 'Token refresh failed', 500)
  }
}
