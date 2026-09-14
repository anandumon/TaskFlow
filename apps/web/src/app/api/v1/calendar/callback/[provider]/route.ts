import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { saveDirectTokens, handleOAuthCode } from '@/server/services/calendar.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const user = await getAuthUser(req)
    const userId = user?.id || 'default-user'
    const body = await req.json()

    if (body.accessToken) {
      // Direct token flow from Supabase OAuth
      const conn = await saveDirectTokens(
        userId,
        params.provider,
        body.accessToken,
        body.refreshToken,
        body.email || user?.email
      )
      return apiSuccess(conn)
    }

    if (body.code) {
      // Standard OAuth authorization code flow
      const conn = await handleOAuthCode(
        userId,
        params.provider,
        body.code,
        body.redirectUri
      )
      return apiSuccess(conn)
    }

    return apiError('Missing accessToken or code in request body', 400)
  } catch (err: any) {
    console.error('[calendar/callback] Error:', err)
    return apiError(err.message || 'OAuth callback failed', 500)
  }
}
