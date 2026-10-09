import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getE2eeKey } from '@/server/services/call.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; callId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const keyData = await getE2eeKey(params.callId, authUser.id)
    if (!keyData) {
      return apiError('E2EE key not available or user unauthorized', 403)
    }

    return apiSuccess(keyData)
  } catch (err: any) {
    return apiError(err.message || 'Internal server error', 500)
  }
}
