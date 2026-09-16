import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  '467128497270-r9o4vs5bdk699dtl58qpoij7k86f4j7t.apps.googleusercontent.com'

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const provider = (params.provider || '').toLowerCase()
    const redirectUri =
      searchParams.get('redirectUri') ||
      `${req.nextUrl.origin}/app/calendar/callback`
    const workspaceId = searchParams.get('workspaceId')

    if (provider === 'google') {
      const scope = encodeURIComponent(
        'https://www.googleapis.com/auth/calendar openid email profile'
      )
      const state = encodeURIComponent(
        JSON.stringify({ provider: 'google', workspaceId, popup: true })
      )

      const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&include_granted_scopes=true&state=${state}`

      return apiSuccess({ authorizationUrl })
    }

    return apiError(`Provider ${provider} not supported`, 400)
  } catch (err: any) {
    return apiError(err.message || 'Failed to generate authorization URL', 500)
  }
}
