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

    // 1. Look up existing user in users table
    const existingUser = await queryOne(
      `SELECT id, email, username, first_name, last_name, display_name, avatar_url, email_verified, status 
       FROM users 
       WHERE email = $1 AND (deleted = false OR deleted IS NULL) 
       LIMIT 1`,
      [cleanEmail]
    )

    // Clean username if provided
    let cleanUsername: string | null = null
    if (typeof username === 'string' && username.trim()) {
      cleanUsername = username.trim().toLowerCase()
      if (cleanUsername.length < 3) {
        return apiError('Username must be at least 3 characters long', 400)
      }
      if (cleanUsername.length > 30) {
        return apiError('Username cannot exceed 30 characters', 400)
      }
      if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
        return apiError('Username can only contain letters, numbers, underscores, and hyphens', 400)
      }

      // Check if username is taken by someone else
      const takenUser = await queryOne(
        `SELECT id FROM users WHERE LOWER(username) = $1 AND (deleted = false OR deleted IS NULL) ${
          existingUser ? 'AND id != $2' : ''
        } LIMIT 1`,
        existingUser ? [cleanUsername, existingUser.id] : [cleanUsername]
      )
      if (takenUser) {
        return apiError('This username is already taken. Please choose another.', 409, 'USERNAME_TAKEN')
      }
    }

    // If user does not exist and no username provided, signal frontend to prompt
    if (!existingUser && !cleanUsername) {
      return apiSuccess({
        requiresUsername: true,
        email: cleanEmail,
        name: name || `${firstName} ${lastName}`,
        avatarUrl,
        provider: provider || 'google',
        isNewUser: true,
      })
    }

    // If existing user has no username and none was provided, signal frontend to prompt
    if (existingUser && !existingUser.username && !cleanUsername) {
      return apiSuccess({
        requiresUsername: true,
        email: cleanEmail,
        name: existingUser.display_name || name || `${existingUser.first_name} ${existingUser.last_name}`,
        avatarUrl: existingUser.avatar_url || avatarUrl,
        provider: provider || 'google',
        isNewUser: false,
      })
    }

    const userId = existingUser?.id || crypto.randomUUID()
    const finalUsername = cleanUsername || existingUser?.username || cleanEmail.split('@')[0]

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
