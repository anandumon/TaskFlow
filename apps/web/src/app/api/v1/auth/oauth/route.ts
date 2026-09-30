import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { query, queryOne } from '@/server/db/postgres'
import crypto from 'crypto'
import { createTaskFlowJwt, createRefreshToken } from '@/server/utils/jwt'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, avatarUrl, provider, username } = body
    if (!email) {
      return apiError('Email is required for OAuth authentication', 400)
    }

    const cleanEmail = email.trim().toLowerCase()
    const nameParts = (name || '').trim().split(' ')
    const firstName = nameParts[0] || 'Google'
    const lastName = nameParts.slice(1).join(' ') || 'User'

    const isSignInMode = body.mode === 'signin'

    // 1. Look up existing user in users table
    const existingUser = await queryOne(
      `SELECT id, email, username, first_name, last_name, display_name, avatar_url, email_verified, status 
       FROM users 
       WHERE email = $1 AND (deleted = false OR deleted IS NULL) 
       LIMIT 1`,
      [cleanEmail]
    )

    // If signin mode and user does not exist in DB, reject with clear message
    if (isSignInMode && !existingUser) {
      return apiError(
        'No TaskFlow account found with this Google email. Please register or sign up first.',
        404,
        'USER_NOT_FOUND'
      )
    }

    // Check account status
    if (existingUser && (existingUser.status === 'SUSPENDED' || existingUser.status === 'DEACTIVATED')) {
      return apiError('Your account has been deactivated or suspended. Please contact support.', 403, 'ACCOUNT_SUSPENDED')
    }

    // Clean or auto-generate username
    let cleanUsername: string | null = null
    if (typeof username === 'string' && username.trim()) {
      cleanUsername = username.trim().toLowerCase()
      if (cleanUsername.length >= 3 && cleanUsername.length <= 30 && /^[a-z0-9_-]+$/.test(cleanUsername)) {
        // Valid username format
      } else {
        cleanUsername = null
      }
    }

    const userId = existingUser?.id || crypto.randomUUID()
    let finalUsername = existingUser?.username || cleanUsername

    if (!finalUsername) {
      const basePrefix = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user'
      let candidate = basePrefix.length < 3 ? `${basePrefix}123` : basePrefix
      let suffix = 1
      while (true) {
        const takenUser = await queryOne(
          `SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2 LIMIT 1`,
          [candidate, userId]
        )
        if (!takenUser) break
        candidate = `${basePrefix.slice(0, 20)}_${suffix++}`
      }
      finalUsername = candidate
    }

    if (!existingUser) {
      // Create new user in users table with email, username, and profile
      await query(
        `INSERT INTO users (
          id, email, username, first_name, last_name, display_name, avatar_url, auth_provider, status, email_verified, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', true, NOW(), NOW()
        )`,
        [
          userId,
          cleanEmail,
          finalUsername,
          firstName,
          lastName,
          name || `${firstName} ${lastName}`.trim() || cleanEmail,
          avatarUrl || null,
          (provider || 'GOOGLE').toUpperCase(),
        ]
      )
    } else if (cleanUsername && cleanUsername !== existingUser.username) {
      // Update existing user with chosen username
      await query(
        `UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2`,
        [cleanUsername, userId]
      )
    } else if (!existingUser.username && finalUsername) {
      await query(
        `UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2`,
        [finalUsername, userId]
      )
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
        username: finalUsername,
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
    if (err?.code === '23505' && err?.message?.includes('username')) {
      return apiError('This username is already taken. Please choose another.', 409, 'USERNAME_TAKEN')
    }
    return apiError(err.message || 'OAuth authentication failed', 500)
  }
}
