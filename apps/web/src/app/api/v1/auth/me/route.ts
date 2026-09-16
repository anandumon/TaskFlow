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
        `SELECT id, email, first_name, last_name, display_name, avatar_url, status, email_verified FROM users WHERE id = $1 LIMIT 1`,
        [authUser.id]
      )
    } catch {}

    const firstName = userRow?.first_name || authUser.fullName?.split(' ')[0] || ''
    const lastName = userRow?.last_name || authUser.fullName?.split(' ').slice(1).join(' ') || ''
    const displayName = userRow?.display_name || authUser.fullName || `${firstName} ${lastName}`.trim() || authUser.email

    return apiSuccess({
      id: authUser.id,
      email: authUser.email,
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
    const { firstName, lastName, displayName, avatarUrl } = body

    await queryOne(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           display_name = COALESCE($3, display_name),
           avatar_url = COALESCE($4, avatar_url),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, first_name, last_name, display_name, avatar_url`,
      [firstName ?? null, lastName ?? null, displayName ?? null, avatarUrl ?? null, authUser.id]
    )

    const updated = await queryOne(
      `SELECT id, email, first_name, last_name, display_name, avatar_url, status, email_verified FROM users WHERE id = $1`,
      [authUser.id]
    )

    return apiSuccess({
      id: authUser.id,
      email: authUser.email,
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

