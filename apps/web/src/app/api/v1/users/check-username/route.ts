import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { queryOne } from '@/server/db/postgres'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawUsername = searchParams.get('username')
    const excludeUserId = searchParams.get('excludeUserId')

    if (!rawUsername || !rawUsername.trim()) {
      return apiSuccess({ available: false, message: 'Username cannot be empty' })
    }

    const username = rawUsername.trim().toLowerCase()

    if (username.length < 3) {
      return apiSuccess({ available: false, message: 'Username must be at least 3 characters' })
    }

    if (username.length > 30) {
      return apiSuccess({ available: false, message: 'Username cannot exceed 30 characters' })
    }

    // Allow alphanumeric characters, underscores, and hyphens
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return apiSuccess({
        available: false,
        message: 'Username can only contain letters, numbers, underscores, and hyphens',
      })
    }

    // Reserved system usernames
    const reserved = ['admin', 'root', 'support', 'system', 'taskflow', 'api', 'help']
    if (reserved.includes(username) && !excludeUserId) {
      return apiSuccess({ available: false, message: 'This username is reserved' })
    }

    let existing: any = null
    if (excludeUserId) {
      existing = await queryOne(
        `SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2 AND (deleted = false OR deleted IS NULL) LIMIT 1`,
        [username, excludeUserId]
      )
    } else {
      existing = await queryOne(
        `SELECT id FROM users WHERE LOWER(username) = $1 AND (deleted = false OR deleted IS NULL) LIMIT 1`,
        [username]
      )
    }

    if (existing) {
      return apiSuccess({
        available: false,
        message: 'This username is already taken. Please choose another.',
      })
    }

    return apiSuccess({
      available: true,
      message: 'Username is available!',
    })
  } catch (err: any) {
    console.error('[API /users/check-username] Error:', err)
    return apiError(err.message || 'Failed to check username availability', 500)
  }
}
