import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'
import { query, queryOne } from '@/server/db/postgres'
import { sendSignInNotificationEmail } from '@/server/services/email.service'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { createTaskFlowJwt, createRefreshToken } from '@/server/utils/jwt'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return apiError('Email and password are required', 400)
    }

    const normalizedEmail = email.trim().toLowerCase()
    let authUser: any = null
    let accessToken = ''
    let refreshToken = ''
    let expiresIn = 3600

    // 1. Try Supabase Auth signInWithPassword
    const { data: suData, error: suError } = await supabaseAdmin.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (suData?.session && suData?.user) {
      accessToken = suData.session.access_token
      refreshToken = suData.session.refresh_token
      expiresIn = suData.session.expires_in
      authUser = suData.user
    } else {
      // 2. Fallback check against users table password_hash
      const dbUser = await queryOne(
        `SELECT * FROM users WHERE email = $1 AND (deleted = false OR deleted IS NULL)`,
        [normalizedEmail]
      )

      if (!dbUser) {
        return apiError('No account found with this email. Please sign up.', 404, 'USER_NOT_FOUND')
      }

      if (dbUser.password_hash && !bcrypt.compareSync(password, dbUser.password_hash)) {
        await query(`UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1 WHERE id = $1`, [dbUser.id])
        return apiError('Invalid email or password', 401, 'BAD_CREDENTIALS')
      }

      if (dbUser.status === 'PENDING' || !dbUser.email_verified) {
        return apiError('Please verify your email address before signing in.', 403, 'EMAIL_NOT_VERIFIED')
      }

      // Sync user into Supabase if missing
      try {
        const { data: createdSuUser } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: dbUser.first_name,
            last_name: dbUser.last_name,
          },
        })
        if (createdSuUser?.user) {
          const { data: session } = await supabaseAdmin.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
          if (session?.session) {
            accessToken = session.session.access_token
            refreshToken = session.session.refresh_token
            authUser = session.user
          }
        }
      } catch {}

      if (!accessToken) {
        accessToken = createTaskFlowJwt({
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.first_name,
          lastName: dbUser.last_name,
        })
        refreshToken = createRefreshToken(dbUser.id)
      }

      authUser = {
        id: dbUser.id,
        email: dbUser.email,
        user_metadata: {
          first_name: dbUser.first_name,
          last_name: dbUser.last_name,
        },
      }
    }

    // Update login timestamp
    try {
      await query(
        `UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0 WHERE email = $1`,
        [normalizedEmail]
      )
    } catch {}

    const firstName = authUser?.user_metadata?.first_name || authUser?.first_name || ''
    const lastName = authUser?.user_metadata?.last_name || authUser?.last_name || ''
    const displayName = `${firstName} ${lastName}`.trim() || normalizedEmail

    // Asynchronously dispatch signin security notification email
    const userAgent = req.headers.get('user-agent') || 'TaskFlow Web'
    sendSignInNotificationEmail(normalizedEmail, firstName, userAgent).catch(err =>
      console.warn('[API /auth/login] Sign-in email notice error:', err)
    )

    const res = apiSuccess({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: authUser.id,
        email: normalizedEmail,
        firstName,
        lastName,
        displayName,
        emailVerified: true,
      },
    })

    // Also attach cookie for browser requests
    res.cookies.set('accessToken', accessToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    })

    return res

  } catch (err: any) {
    console.error('[API /auth/login] Error:', err)
    return apiError(err.message || 'Login failed', 500)
  }
}
