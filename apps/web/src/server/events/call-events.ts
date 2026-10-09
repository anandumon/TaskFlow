import { EventEmitter } from 'events'

declare global {
  // eslint-disable-next-line no-var
  var __taskflowCallEventEmitter: EventEmitter | undefined
}

if (!globalThis.__taskflowCallEventEmitter) {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(200)
  globalThis.__taskflowCallEventEmitter = emitter
}

export const callEventEmitter: EventEmitter = globalThis.__taskflowCallEventEmitter

export interface CallRealtimeEvent {
  type:
    | 'call_incoming'
    | 'call_accepted'
    | 'call_declined'
    | 'call_started'
    | 'call_ended'
    | 'call_participant_joined'
    | 'call_participant_left'
    | 'call_participant_removed'
    | 'call_e2ee_rotated'
  workspaceId: string
  callId: string
  callerId?: string
  recipientId?: string
  channelId?: string
  data: any
  timestamp: string
}

/**
 * Broadcasts call events to both the in-process event emitter and the Socket.IO bridge
 */
export function broadcastCallEvent(event: CallRealtimeEvent) {
  try {
    callEventEmitter.emit('call_event', event)

    // Bridge to Socket.IO daemon on port 3001 if available
    const socketPort = process.env.SOCKET_PORT || 3001
    fetch(`http://localhost:${socketPort}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: event.type,
        workspaceId: event.workspaceId,
        channelId: event.channelId,
        recipientId: event.recipientId,
        data: {
          callId: event.callId,
          ...event.data,
          timestamp: event.timestamp,
        },
      }),
    }).catch(() => {
      // Fire-and-forget: ignore offline socket server errors
    })
  } catch (err) {
    console.warn('[call-events] Broadcast warning:', err)
  }
}
