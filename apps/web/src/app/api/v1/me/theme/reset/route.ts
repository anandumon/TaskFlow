import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { queryOne } from '@/server/db/postgres'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }

    const resetRow = await queryOne(
      `INSERT INTO user_theme_preferences (user_id, theme_id, theme_type, custom_theme, created_at, updated_at)
       VALUES ($1, 'NEUTRAL', 'PRESET', NULL, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         theme_id = 'NEUTRAL',
         theme_type = 'PRESET',
         custom_theme = NULL,
         updated_at = NOW()
       RETURNING theme_id, theme_type, custom_theme, updated_at`,
      [authUser.id]
    )

    return apiSuccess({
      themeId: resetRow.theme_id,
      themeType: resetRow.theme_type,
      customTheme: resetRow.custom_theme || null,
      updatedAt: resetRow.updated_at,
    })
  } catch (err: any) {
    console.error('[API POST /me/theme/reset] Error:', err)
    return apiError(err.message || 'Failed to reset theme', 500)
  }
}
