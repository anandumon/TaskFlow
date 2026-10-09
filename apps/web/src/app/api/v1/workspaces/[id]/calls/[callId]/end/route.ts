import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { endCall } from '@/server/services/call.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; callId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const body = await req.json().catch(() => ({}))
    const reason = body?.reason || 'USER_HANGUP'

    const result = await endCall(params.callId, authUser.id, reason)
    if (!result.success) {
      return apiError('Failed to end call', 400)
    }

    return apiSuccess(result.callSession)
  } catch (err: any) {
    return apiError(err.message || 'Internal server error', 500)
  }
}
