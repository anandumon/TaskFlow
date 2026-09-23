import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { queryOne } from '@/server/db/postgres'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError(
        'Authentication required. Please provide a valid Bearer token in the Authorization header or sign in.',
        401,
        'UNAUTHORIZED'
      )
    }

    // Attempt to query detailed profile from users table
    let userRow: any = null
    try {
      userRow = await queryOne(
        `SELECT id, email, first_name, last_name, display_name, avatar_url, status, email_verified, username FROM users WHERE id = $1 LIMIT 1`,
        [authUser.id]
      )
    } catch {}

    const firstName = userRow?.first_name || authUser.fullName?.split(' ')[0] || ''
    const lastName = userRow?.last_name || authUser.fullName?.split(' ').slice(1).join(' ') || ''
    const displayName = userRow?.display_name || authUser.fullName || `${firstName} ${lastName}`.trim() || authUser.email

    return apiSuccess({
      id: authUser.id,
      email: authUser.email,
      username: userRow?.username || null,
      firstName,
      lastName,
      displayName,
      emailVerified: userRow ? !!userRow.email_verified : true,
      avatarUrl: userRow?.avatar_url || null,
      status: userRow?.status || 'ACTIVE',
      isNewUser: false,
    })

  } catch (err: any) {
    console.error('[API /auth/me] Error:', err)
    return apiError(err.message || 'Failed to get user profile', 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }
    const body = await req.json()
    const { firstName, lastName, displayName, avatarUrl, username } = body

    // 1. If username update requested, check uniqueness and format
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

      // Check if another user already has this username
      const existingUser = await queryOne(
        `SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2 AND (deleted = false OR deleted IS NULL) LIMIT 1`,
        [cleanUsername, authUser.id]
      )
      if (existingUser) {
        return apiError('This username is already taken. Please choose another.', 409, 'USERNAME_TAKEN')
      }
    }

    const hasAvatar = Object.prototype.hasOwnProperty.call(body, 'avatarUrl')
    const cleanAvatar = avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== '' ? avatarUrl.trim() : null

    if (hasAvatar) {
      await queryOne(
        `UPDATE users 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             display_name = COALESCE($3, display_name),
             avatar_url = $4,
             username = COALESCE($5, username),
             updated_at = NOW()
         WHERE id = $6
         RETURNING id, email, username, first_name, last_name, display_name, avatar_url`,
        [firstName ?? null, lastName ?? null, displayName ?? null, cleanAvatar, cleanUsername, authUser.id]
      )
    } else {
      await queryOne(
        `UPDATE users 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             display_name = COALESCE($3, display_name),
             username = COALESCE($4, username),
             updated_at = NOW()
         WHERE id = $5
         RETURNING id, email, username, first_name, last_name, display_name, avatar_url`,
        [firstName ?? null, lastName ?? null, displayName ?? null, cleanUsername, authUser.id]
      )
    }

    const updated = await queryOne(
      `SELECT id, email, username, first_name, last_name, display_name, avatar_url, status, email_verified FROM users WHERE id = $1`,
      [authUser.id]
    )

    return apiSuccess({
      id: authUser.id,
      email: authUser.email,
      username: updated?.username || null,
      firstName: updated?.first_name || '',
      lastName: updated?.last_name || '',
      displayName: updated?.display_name || authUser.fullName || authUser.email,
      avatarUrl: updated?.avatar_url || null,
      emailVerified: updated ? !!updated.email_verified : true,
      status: updated?.status || 'ACTIVE',
    })
  } catch (err: any) {
    console.error('[API PATCH /auth/me] Error:', err)
    return apiError(err.message || 'Failed to update user profile', 500)
  }
}

