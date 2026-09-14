import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { queryOne } from '@/server/db/postgres'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    if (!email) {
      return apiError('Email parameter is required', 400)
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await queryOne(
      `SELECT id, email_verified, status FROM users WHERE email = $1 AND (deleted = false OR deleted IS NULL)`,
      [normalizedEmail]
    )

    return apiSuccess({
      exists: !!user,
      emailVerified: user ? !!user.email_verified : false,
      status: user?.status || 'NOT_FOUND',
    })
  } catch (err: any) {
    console.error('[API /auth/check-user] Error:', err)
    return apiError(err.message || 'Failed to check user', 500)
  }
}
