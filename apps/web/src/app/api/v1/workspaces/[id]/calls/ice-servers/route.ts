import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser, canUserAccessWorkspace } from '@/server/utils/auth'
import { getIceServers } from '@/features/calls/utils/webrtc'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/workspaces/[id]/calls/ice-servers
 * Returns verified STUN and TURN configurations for authorized workspace members
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const { id: workspaceId } = params
    const hasAccess = await canUserAccessWorkspace(authUser.id, workspaceId)
    if (!hasAccess) {
      return apiError('Forbidden', 403)
    }

    const iceServers = getIceServers()
    return apiSuccess({ iceServers })
  } catch (err: any) {
    return apiError(err.message || 'Failed to retrieve ICE servers', 500)
  }
}
