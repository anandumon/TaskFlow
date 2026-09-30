/**
 * TaskFlow Real-Time Presence Service
 * Manages active online users with heartbeat deduplication,
 * workspace grouping, and fast in-memory presence lookups.
 */

interface PresenceEntry {
  userId: string
  name: string
  email: string
  workspaceId?: string
  status: 'online' | 'away' | 'offline'
  lastSeen: number
}

// Global registry shared across Next.js API route handlers in Node runtime
const globalForPresence = global as unknown as {
  __taskflowPresence: Map<string, PresenceEntry> | undefined
}

export const presenceRegistry =
  globalForPresence.__taskflowPresence || new Map<string, PresenceEntry>()

if (process.env.NODE_ENV !== 'production') {
  globalForPresence.__taskflowPresence = presenceRegistry
}

// Consider users online if heartbeat was within the last 45 seconds
const ONLINE_TTL_MS = 45000

export function recordHeartbeat(
  userId: string,
  data: {
    name?: string
    email?: string
    workspaceId?: string
    status?: 'online' | 'away' | 'offline'
  } = {}
) {
  if (!userId) return

  const existing = presenceRegistry.get(userId)
  const status = data.status || 'online'

  if (status === 'offline') {
    presenceRegistry.delete(userId)
    return
  }

  presenceRegistry.set(userId, {
    userId,
    name: data.name || existing?.name || 'Member',
    email: (data.email || existing?.email || '').toLowerCase(),
    workspaceId: data.workspaceId || existing?.workspaceId,
    status,
    lastSeen: Date.now(),
  })
}

export function setOffline(userId: string) {
  if (!userId) return
  presenceRegistry.delete(userId)
}

export function getActivePresence(workspaceId?: string) {
  const now = Date.now()
  const onlineUserIds: string[] = []
  const onlineEmails: string[] = []
  const users: Array<{
    userId: string
    name: string
    email: string
    status: string
    lastSeen: number
  }> = []

  presenceRegistry.forEach((entry, userId) => {
    // Check if expired
    if (now - entry.lastSeen > ONLINE_TTL_MS) {
      presenceRegistry.delete(userId)
      return
    }

    if (entry.status !== 'offline') {
      onlineUserIds.push(userId)
      if (entry.email) onlineEmails.push(entry.email.toLowerCase())
      users.push({
        userId,
        name: entry.name,
        email: entry.email,
        status: entry.status,
        lastSeen: entry.lastSeen,
      })
    }
  })

  return {
    onlineUserIds,
    onlineEmails,
    users,
    count: onlineUserIds.length,
  }
}
