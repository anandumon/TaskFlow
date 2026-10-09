import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { generateLiveKitToken, getCallSession } from '@/server/services/call.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; callId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const session = await getCallSession(params.callId)
    if (!session) {
      return apiError('Call session not found', 404)
    }

    if (session.status === 'ENDED' || session.status === 'CANCELLED') {
      return apiError('Call has already ended', 409)
    }

    const userName =
      authUser.fullName ||
      (authUser.firstName
        ? `${authUser.firstName} ${authUser.lastName || ''}`.trim()
        : authUser.email.split('@')[0])

    const isHost = session.createdBy === authUser.id

    const tokenData = await generateLiveKitToken(
      params.callId,
      {
        id: authUser.id,
        name: userName,
        avatarUrl: authUser.avatarUrl,
      },
      isHost ? 'HOST' : 'PARTICIPANT'
    )

    return apiSuccess(tokenData)
  } catch (err: any) {
    console.error('[calls token API] Error generating token:', err)
    return apiError(err.message || 'Failed to generate media token', 500)
  }
}
