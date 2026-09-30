import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import {
  getChannelMessages,
  getDirectMessages,
  sendMessage,
} from '@/server/services/chat.service'
import { broadcastChatEvent } from '@/server/events/chat-events'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')
    const recipientId = searchParams.get('recipientId')

    if (channelId) {
      const messages = await getChannelMessages(channelId, authUser?.id)
      return apiSuccess(messages)
    }

    if (recipientId && authUser?.id) {
      const messages = await getDirectMessages(params.id, authUser.id, recipientId)
      return apiSuccess(messages)
    }

    return apiSuccess([])
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch messages', 500)
  }
}

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
    const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0
    if ((!body.content || !body.content.trim()) && !hasAttachments) {
      return apiError('Message content is required', 400)
    }
    const finalContent = (body.content && body.content.trim()) || ''

    const senderName =
      authUser.firstName || authUser.lastName
        ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim()
        : authUser.email?.split('@')[0] || 'User'

    const message = await sendMessage(params.id, {
      channelId: body.channelId,
      recipientId: body.recipientId,
      senderId: authUser.id,
      senderName: senderName,
      senderAvatar: authUser.avatarUrl,
      content: finalContent,
      attachments: body.attachments || [],
    })

    // Broadcast in real-time to all connected users
    broadcastChatEvent({
      type: 'new_message',
      workspaceId: params.id,
      channelId: body.channelId,
      recipientId: body.recipientId,
      senderId: authUser.id,
      data: message,
      timestamp: new Date().toISOString(),
    })

    return apiSuccess(message, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to send message', 500)
  }
}
