import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { respondToCall } from '@/server/services/call.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; callId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const body = await req.json()
    const { action } = body

    if (action !== 'ACCEPT' && action !== 'DECLINE') {
      return apiError('Action must be ACCEPT or DECLINE', 400)
    }

    const result = await respondToCall(params.callId, authUser.id, action)
    if (!result.success) {
      return apiError(result.error || 'Failed to respond to call', 400)
    }

    return apiSuccess(result.callSession)
  } catch (err: any) {
    return apiError(err.message || 'Internal server error', 500)
  }
}
