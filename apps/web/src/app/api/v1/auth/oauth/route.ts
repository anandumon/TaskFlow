import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'
import crypto from 'crypto'
import { createTaskFlowJwt, createRefreshToken } from '@/server/utils/jwt'

export async function POST(req: NextRequest) {
  try {
    const { email, name, avatarUrl, provider } = await req.json()
    if (!email) {
      return apiError('Email is required for OAuth authentication', 400)
    }

    const cleanEmail = email.trim().toLowerCase()
    const nameParts = (name || '').trim().split(' ')
    const firstName = nameParts[0] || 'Google'
    const lastName = nameParts.slice(1).join(' ') || 'User'

    // Look up or register user in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle()

    const userId = existingUser?.id || crypto.randomUUID()
    const now = new Date().toISOString()

    if (!existingUser) {
      await supabaseAdmin.from('users').insert({
        id: userId,
        email: cleanEmail,
        first_name: firstName,
        last_name: lastName,
        display_name: name || cleanEmail,
        avatar_url: avatarUrl,
        provider: (provider || 'GOOGLE').toUpperCase(),
        email_verified: true,
        created_at: now,
        updated_at: now,
      })
    }

    const accessToken = createTaskFlowJwt({
      id: userId,
      email: cleanEmail,
      firstName,
      lastName,
      fullName: name || `${firstName} ${lastName}`,
    })
    const refreshToken = createRefreshToken(userId)

    const res = apiSuccess({
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: cleanEmail,
        firstName,
        lastName,
        displayName: name || `${firstName} ${lastName}`,
        avatarUrl,
        emailVerified: true,
        isNewUser: !existingUser,
      },
    })


    res.cookies.set('accessToken', accessToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    })

    return res
  } catch (err: any) {
    console.error('[auth/oauth] Error:', err)

    return apiError(err.message || 'OAuth authentication failed', 500)
  }
}
