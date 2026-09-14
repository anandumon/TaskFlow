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

