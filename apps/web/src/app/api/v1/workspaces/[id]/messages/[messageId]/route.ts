import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import {
  editMessage,
  togglePinMessage,
  deleteMessageForEveryone,
  deleteMessageForMe,
} from '@/server/services/chat.service'
import { broadcastChatEvent } from '@/server/events/chat-events'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const body = await req.json()
    const { action } = body

    if (action === 'pin') {
      const isPinned = Boolean(body.isPinned)
      const updated = await togglePinMessage(params.id, params.messageId, isPinned)
      if (!updated) {
        return apiError('Message not found or failed to update pin status', 404)
      }

      broadcastChatEvent({
        type: 'pin_message',
        workspaceId: params.id,
        channelId: updated.channelId,
        recipientId: updated.recipientId,
        senderId: authUser.id,
        data: updated,
        timestamp: new Date().toISOString(),
      })

      return apiSuccess(updated)
    }

    if (action === 'edit' || body.content !== undefined) {
      if (typeof body.content !== 'string' || !body.content.trim()) {
        return apiError('Content is required to edit message', 400)
      }
      const updated = await editMessage(
        params.id,
        params.messageId,
        body.content.trim(),
        body.attachments
      )
      if (!updated) {
        return apiError('Message not found or failed to update', 404)
      }

      broadcastChatEvent({
        type: 'edit_message',
        workspaceId: params.id,
        channelId: updated.channelId,
        recipientId: updated.recipientId,
        senderId: authUser.id,
        data: updated,
        timestamp: new Date().toISOString(),
      })

      return apiSuccess(updated)
    }

    return apiError('Invalid patch action', 400)
  } catch (err: any) {
    return apiError(err.message || 'Failed to update message', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'everyone' // 'everyone' | 'me'

    if (mode === 'me') {
      const success = await deleteMessageForMe(params.id, params.messageId, authUser.id)
      if (!success) {
        return apiError('Failed to delete message for current user', 500)
      }

      broadcastChatEvent({
        type: 'delete_message',
        workspaceId: params.id,
        senderId: authUser.id,
        data: { id: params.messageId, mode: 'me', userId: authUser.id },
        timestamp: new Date().toISOString(),
      })

      return apiSuccess({ deleted: true, mode: 'me' })
    }

    // Default: 'everyone' - hard delete from database with zero trace
    const success = await deleteMessageForEveryone(params.id, params.messageId)
    if (!success) {
      return apiError('Failed to delete message from database', 500)
    }

    broadcastChatEvent({
      type: 'delete_message',
      workspaceId: params.id,
      senderId: authUser.id,
      data: { id: params.messageId, mode: 'everyone' },
      timestamp: new Date().toISOString(),
    })

    return apiSuccess({ deleted: true, mode: 'everyone' })
  } catch (err: any) {
    return apiError(err.message || 'Failed to delete message', 500)
  }
}
