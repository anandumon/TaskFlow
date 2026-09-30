import { NextRequest } from 'next/server'
import { getAuthUser } from '@/server/utils/auth'
import { chatEventEmitter, ChatRealtimeEvent } from '@/server/events/chat-events'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    const { searchParams } = new URL(req.url)
    const currentUserId = authUser?.id || searchParams.get('userId')
    const workspaceId = params.id
    const targetChannelId = searchParams.get('channelId')
    const targetRecipientId = searchParams.get('recipientId')

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connected handshake
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'connected',
              workspaceId,
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        )

        // Event listener for chat broadcasts
        const onChatEvent = (event: ChatRealtimeEvent) => {
          if (event.workspaceId !== workspaceId) return

          // Direct message filtering: only deliver if user is sender or recipient
          if (event.recipientId) {
            const isRelevantDM =
              !currentUserId ||
              event.recipientId === currentUserId ||
              event.senderId === currentUserId

            if (!isRelevantDM) return
          }

          // Channel filtering if client requested specific channel
          if (targetChannelId && event.channelId && event.channelId !== targetChannelId) {
            // Still deliver if it's a DM, but skip mismatched channel
            return
          }

          try {
            const dataString = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(dataString))
          } catch (err) {
            // Stream might be closed
          }
        }

        chatEventEmitter.on('chat_event', onChatEvent)

        // Keep-alive heartbeat comment every 15 seconds to prevent timeout
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'))
          } catch {
            clearInterval(heartbeat)
          }
        }, 15000)

        // Cleanup on abort
        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          chatEventEmitter.off('chat_event', onChatEvent)
          try {
            controller.close()
          } catch {}
        })
      },
      cancel() {
        // Handled via req.signal abort
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform, no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    return new Response(`Error: ${err?.message || 'Failed to initialize stream'}`, {
      status: 500,
    })
  }
}
