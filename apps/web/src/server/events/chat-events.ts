import { EventEmitter } from 'events'

// Global singleton EventEmitter across Next.js API routes in the Node.js process
declare global {
  // eslint-disable-next-line no-var
  var __taskflowChatEventEmitter: EventEmitter | undefined
}

if (!globalThis.__taskflowChatEventEmitter) {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(200)
  globalThis.__taskflowChatEventEmitter = emitter
}

export const chatEventEmitter: EventEmitter = globalThis.__taskflowChatEventEmitter

export interface ChatRealtimeEvent {
  type: 'new_message' | 'edit_message' | 'delete_message' | 'pin_message'
  workspaceId: string
  channelId?: string
  recipientId?: string
  senderId?: string
  data: any
  timestamp: string
}

/**
 * Broadcasts chat events to in-process SSE streams and optional external Socket.IO bridge
 */
export function broadcastChatEvent(event: ChatRealtimeEvent) {
  try {
    chatEventEmitter.emit('chat_event', event)

    // Optional fire-and-forget bridge to Socket.IO daemon if running
    if (process.env.SOCKET_PORT || process.env.ENABLE_SOCKET_BRIDGE) {
      fetch('http://localhost:3001/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: event.type,
          workspaceId: event.workspaceId,
          channelId: event.channelId,
          recipientId: event.recipientId,
          data: event.data,
        }),
      }).catch(() => {})
    }
  } catch (err) {
    console.warn('[chat-events] Broadcast warning:', err)
  }
}
