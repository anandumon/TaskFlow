import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser, canUserAccessWorkspace } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'
import { broadcastCallEvent } from '@/server/events/call-events'

export const dynamic = 'force-dynamic'

/**
 * Validates that the user is an authorized participant or host of the call session
 */
async function verifyCallAccess(callId: string, userId: string, workspaceId: string) {
  const session = await queryOne(
    `SELECT cs.id, cs.workspace_id, cs.status, cs.created_by
     FROM call_sessions cs
     WHERE cs.id = $1 AND cs.workspace_id = $2`,
    [callId, workspaceId]
  )
  if (!session) return { allowed: false, reason: 'Call session not found' }

  if (session.created_by === userId) {
    return { allowed: true, session }
  }

  const participant = await queryOne(
    `SELECT id, status FROM call_participants 
     WHERE call_session_id = $1 AND user_id = $2`,
    [callId, userId]
  )

  if (!participant) {
    return { allowed: false, reason: 'Unauthorized: User is not a participant of this call' }
  }

  return { allowed: true, session }
}

/**
 * POST /api/v1/workspaces/[id]/calls/[callId]/signal
 * Sends a WebRTC signaling message (OFFER, ANSWER, ICE_CANDIDATE)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; callId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const { id: workspaceId, callId } = params

    const hasAccess = await canUserAccessWorkspace(authUser.id, workspaceId)
    if (!hasAccess) {
      return apiError('Forbidden: Access denied to this workspace', 403)
    }

    const verification = await verifyCallAccess(callId, authUser.id, workspaceId)
    if (!verification.allowed) {
      return apiError(verification.reason || 'Forbidden', 403)
    }

    const body = await req.json()
    const { type, payload, recipientId } = body

    if (!type || !['OFFER', 'ANSWER', 'ICE_CANDIDATE'].includes(type.toUpperCase())) {
      return apiError('Invalid signal type. Expected OFFER, ANSWER, or ICE_CANDIDATE', 400)
    }

    if (!payload || typeof payload !== 'object') {
      return apiError('Signal payload is required and must be an object', 400)
    }

    const normalizedType = type.toUpperCase()

    // Store signal in DB for durability
    const inserted = await queryOne(
      `INSERT INTO call_signals (
         call_session_id, sender_id, recipient_id, type, payload, created_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, created_at`,
      [
        callId,
        authUser.id,
        recipientId || null,
        normalizedType,
        JSON.stringify(payload),
      ]
    )

    // Broadcast signaling event for instant delivery
    broadcastCallEvent({
      type: 'call_started', // re-use realtime bus channel
      workspaceId,
      callId,
      callerId: authUser.id,
      recipientId: recipientId || undefined,
      timestamp: inserted.created_at,
      data: {
        signal: {
          id: inserted.id,
          callId,
          senderId: authUser.id,
          recipientId: recipientId || null,
          type: normalizedType,
          payload,
          createdAt: inserted.created_at,
        },
      },
    })

    return apiSuccess({
      signalId: inserted.id,
      timestamp: inserted.created_at,
    })
  } catch (err: any) {
    console.error('[call signal POST] Error:', err)
    return apiError(err.message || 'Failed to send signal', 500)
  }
}

/**
 * GET /api/v1/workspaces/[id]/calls/[callId]/signal
 * Retrieves incoming WebRTC signals for the caller/recipient
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; callId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const { id: workspaceId, callId } = params

    const hasAccess = await canUserAccessWorkspace(authUser.id, workspaceId)
    if (!hasAccess) {
      return apiError('Forbidden', 403)
    }

    const verification = await verifyCallAccess(callId, authUser.id, workspaceId)
    if (!verification.allowed) {
      return apiError(verification.reason || 'Forbidden', 403)
    }

    const { searchParams } = new URL(req.url)
    const sinceParam = searchParams.get('since')
    const fetchAll = !sinceParam || sinceParam === '0' || sinceParam === 'all'

    // Retrieve signals sent by OTHER participants directed to this user or broadcast
    const signals = fetchAll
      ? await query(
          `SELECT id, call_session_id, sender_id, recipient_id, type, payload, created_at
           FROM call_signals
           WHERE call_session_id = $1
             AND sender_id != $2
             AND (recipient_id IS NULL OR recipient_id = $2)
           ORDER BY created_at ASC
           LIMIT 100`,
          [callId, authUser.id]
        )
      : await query(
          `SELECT id, call_session_id, sender_id, recipient_id, type, payload, created_at
           FROM call_signals
           WHERE call_session_id = $1
             AND sender_id != $2
             AND (recipient_id IS NULL OR recipient_id = $2)
             AND created_at >= $3
           ORDER BY created_at ASC
           LIMIT 50`,
          [callId, authUser.id, sinceParam]
        )

    const formatted = signals.map((s: any) => ({
      id: s.id,
      callId: s.call_session_id,
      senderId: s.sender_id,
      recipientId: s.recipient_id,
      type: s.type,
      payload: typeof s.payload === 'string' ? JSON.parse(s.payload) : s.payload,
      createdAt: s.created_at,
    }))

    return apiSuccess(formatted)
  } catch (err: any) {
    console.error('[call signal GET] Error:', err)
    return apiError(err.message || 'Failed to retrieve signals', 500)
  }
}
