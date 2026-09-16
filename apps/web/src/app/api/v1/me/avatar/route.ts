import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { queryOne } from '@/server/db/postgres'

export async function POST(req: NextRequest) {
  return handleAvatarUpdate(req)
}

export async function PATCH(req: NextRequest) {
  return handleAvatarUpdate(req)
}

async function handleAvatarUpdate(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }

    const body = await req.json()
    const { avatarUrl } = body

    if (avatarUrl === undefined) {
      return apiError('avatarUrl is required', 400)
    }

    const updated = await queryOne(
      `UPDATE users 
       SET avatar_url = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, email, first_name, last_name, display_name, avatar_url`,
      [avatarUrl, authUser.id]
    )

    return apiSuccess({
      id: authUser.id,
      email: authUser.email,
      avatarUrl: updated?.avatar_url || null,
    })
  } catch (err: any) {
    console.error('[API /me/avatar] Error:', err)
    return apiError(err.message || 'Failed to update avatar', 500)
  }
}
