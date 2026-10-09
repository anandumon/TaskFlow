import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getCallSession } from '@/server/services/call.service'

export async function GET(
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
      return apiError('Call not found', 404)
    }

    return apiSuccess(session)
  } catch (err: any) {
    return apiError(err.message || 'Internal server error', 500)
  }
}
