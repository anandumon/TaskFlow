import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'
import { queryOne } from '@/server/db/postgres'
import { createTaskFlowJwt, createRefreshToken, verifyTaskFlowJwt } from '@/server/utils/jwt'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const refreshToken = body.refreshToken || req.cookies.get('refreshToken')?.value
    if (!refreshToken) {
      return apiError('Refresh token is required', 400)
    }

    // 1. Try Supabase Auth session refresh
    if (typeof refreshToken === 'string' && !refreshToken.includes('.')) {
      try {
        const { data, error } = await supabaseAdmin.auth.refreshSession({
          refresh_token: refreshToken,
        })

        if (data?.session && data?.user) {
          const u = data.user
          const res = apiSuccess({
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

          res.cookies.set('accessToken', data.session.access_token, {
            path: '/',
            httpOnly: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
          })

          return res
        }
      } catch {}
    }

    // 2. Try TaskFlow Native JWT refresh
    let userId = ''
    const payload = verifyTaskFlowJwt(refreshToken)
    if (payload?.sub) {
      userId = payload.sub
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refreshToken)) {
      userId = refreshToken
    }

    if (userId) {
      const user = await queryOne(
        `SELECT id, email, first_name, last_name, display_name, email_verified, status FROM users WHERE id = $1 AND (deleted = false OR deleted IS NULL) LIMIT 1`,
        [userId]
      )
      if (user) {
        const newAccessToken = createTaskFlowJwt({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: user.display_name,
        })
        const newRefreshToken = createRefreshToken(user.id)

        const res = apiSuccess({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: 7 * 24 * 60 * 60,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            displayName: user.display_name || user.email,
            emailVerified: !!user.email_verified,
          },
        })

        res.cookies.set('accessToken', newAccessToken, {
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
        })

        return res
      }
    }

    return apiError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN')
  } catch (err: any) {
    console.error('[API /auth/refresh] Error:', err)
    return apiError(err.message || 'Token refresh failed', 500)
  }
}

