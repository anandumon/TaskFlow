import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { createCall, getCallSession, getIncomingCallForUser } from '@/server/services/call.service'
import { query } from '@/server/db/postgres'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const body = await req.json()
    const { callType, recipientId, channelId, isE2EE } = body

    if (!callType) {
      return apiError('callType is required', 400)
    }

    const callerName =
      authUser.fullName ||
      (authUser.firstName
        ? `${authUser.firstName} ${authUser.lastName || ''}`.trim()
        : authUser.email.split('@')[0])

    const result = await createCall(
      params.id,
      {
        id: authUser.id,
        name: callerName,
        avatarUrl: authUser.avatarUrl,
      },
      {
        callType,
        recipientId,
        channelId,
        isE2EE,
      }
    )

    if (!result.success) {
      return apiError(result.error || 'Failed to initiate call', 409, result.code || 'CONFLICT')
    }

    return apiSuccess(result.callSession, 201)
  } catch (err: any) {
    console.error('[calls API] Error creating call:', err)
    return apiError(err.message || 'Internal server error', 500)
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const { searchParams } = new URL(req.url)
    const checkIncoming = searchParams.get('incoming') === 'true'

    if (checkIncoming) {
      const incoming = await getIncomingCallForUser(authUser.id)
      return apiSuccess(incoming)
    }

    const channelId = searchParams.get('channelId')
    const activeOnly = searchParams.get('active') === 'true'

    let sql = `
      SELECT cs.*, 
             u.display_name AS creator_display_name,
             u.first_name AS creator_first_name,
             u.avatar_url AS creator_avatar_url
      FROM call_sessions cs
      LEFT JOIN users u ON u.id = cs.created_by
      WHERE cs.workspace_id = $1
    `
    const queryParams: any[] = [params.id]

    if (activeOnly) {
      sql += ` AND cs.status IN ('RINGING', 'ACTIVE')`
    }
    if (channelId) {
      queryParams.push(channelId)
      sql += ` AND cs.channel_id = $${queryParams.length}`
    }

    sql += ` ORDER BY cs.created_at DESC LIMIT 20`

    const rows = await query(sql, queryParams)
    return apiSuccess(rows)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch calls', 500)
  }
}
