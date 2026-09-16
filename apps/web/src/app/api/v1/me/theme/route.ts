import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { queryOne } from '@/server/db/postgres'
import { isPresetThemeId } from '@/lib/theme/definitions'
import { validateCustomThemeColors } from '@/lib/theme/validator'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }

    let pref = await queryOne(
      `SELECT theme_id, theme_type, custom_theme, updated_at 
       FROM user_theme_preferences 
       WHERE user_id = $1 
       LIMIT 1`,
      [authUser.id]
    )

    // Default to NEUTRAL if no record exists yet
    if (!pref) {
      pref = await queryOne(
        `INSERT INTO user_theme_preferences (user_id, theme_id, theme_type, custom_theme, created_at, updated_at)
         VALUES ($1, 'NEUTRAL', 'PRESET', NULL, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
         RETURNING theme_id, theme_type, custom_theme, updated_at`,
        [authUser.id]
      )
    }

    return apiSuccess({
      themeId: pref.theme_id,
      themeType: pref.theme_type,
      customTheme: pref.custom_theme || null,
      updatedAt: pref.updated_at,
    })
  } catch (err: any) {
    console.error('[API GET /me/theme] Error:', err)
    return apiError(err.message || 'Failed to retrieve user theme', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }

    const body = await req.json()
    const { themeId, themeType, customTheme } = body

    if (!themeType || (themeType !== 'PRESET' && themeType !== 'CUSTOM')) {
      return apiError("themeType must be either 'PRESET' or 'CUSTOM'", 400, 'INVALID_THEME_TYPE')
    }

    let sanitizedCustomTheme: any = null

    if (themeType === 'PRESET') {
      if (!themeId || !isPresetThemeId(themeId)) {
        return apiError(
          `Invalid preset themeId '${themeId}'. Supported presets: DUSK, SAGE, OCEAN, SUNSET, LAVENDER, MUSTARD, TEAL_GRAY, BERRY, ARCTIC, NEUTRAL.`,
          400,
          'INVALID_THEME_ID'
        )
      }
      if (customTheme !== null && customTheme !== undefined) {
        return apiError('customTheme must be null when themeType is PRESET', 400, 'INVALID_PRESET_PAYLOAD')
      }
    } else {
      // CUSTOM
      if (themeId !== 'CUSTOM') {
        return apiError("themeId must be 'CUSTOM' when themeType is 'CUSTOM'", 400, 'INVALID_THEME_ID')
      }
      const validation = validateCustomThemeColors(customTheme)
      if (!validation.isValid || !validation.sanitized) {
        return apiError(validation.error || 'Invalid custom colors provided', 400, 'INVALID_CUSTOM_THEME')
      }
      sanitizedCustomTheme = validation.sanitized
    }

    const updated = await queryOne(
      `INSERT INTO user_theme_preferences (user_id, theme_id, theme_type, custom_theme, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         theme_id = EXCLUDED.theme_id,
         theme_type = EXCLUDED.theme_type,
         custom_theme = EXCLUDED.custom_theme,
         updated_at = NOW()
       RETURNING theme_id, theme_type, custom_theme, updated_at`,
      [authUser.id, themeId, themeType, sanitizedCustomTheme ? JSON.stringify(sanitizedCustomTheme) : null]
    )

    return apiSuccess({
      themeId: updated.theme_id,
      themeType: updated.theme_type,
      customTheme: updated.custom_theme || null,
      updatedAt: updated.updated_at,
    })
  } catch (err: any) {
    console.error('[API PUT /me/theme] Error:', err)
    return apiError(err.message || 'Failed to update user theme', 500)
  }
}
