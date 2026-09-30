/**
 * TaskFlow Bi-Directional Real-Time Engine (Socket.IO)
 * Discord / Slack Architecture for:
 * 1. Instant Zero-Latency Chat Messages (Channels & Direct Messages)
 * 2. Real-Time Workspace Task Assignment & Status Sync
 * 3. Real-Life Presence Management (Heartbeat, Multi-Tab deduplication, Graceful Disconnect, Instant Logout)
 */

const http = require('http')
const { Server } = require('socket.io')

const PORT = process.env.SOCKET_PORT || 3001

// In-Memory Presence & Room Registries
// workspaceId -> Map<userId, { socketIds: Set<string>, status: 'online' | 'away', lastSeen: number, name: string, email: string }>
const workspacePresence = new Map()

// socketId -> { userId, workspaceId, userName, userEmail }
const socketMeta = new Map()

// Disconnect grace timers: `${workspaceId}:${userId}` -> NodeJS.Timeout
const disconnectGraceTimers = new Map()

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'TaskFlow Real-Time Engine',
        connectedSockets: socketMeta.size,
        workspacesActive: workspacePresence.size,
      })
    )
    return
  }

  // HTTP Broadcast Bridge: Allows Next.js REST API routes to broadcast to socket clients
  if (req.url === '/broadcast' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        const { event, workspaceId, channelId, recipientId, data } = payload

        if (channelId) {
          io.to(`channel:${channelId}`).emit(event, data)
        } else if (recipientId) {
          io.to(`user:${recipientId}`).emit(event, data)
        } else if (workspaceId) {
          io.to(`workspace:${workspaceId}`).emit(event, data)
        } else {
          io.emit(event, data)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 20000,
  pingTimeout: 10000,
})

// Helper: Get list of online users in a workspace
function getOnlineUserIds(workspaceId) {
  const wsMap = workspacePresence.get(workspaceId)
  if (!wsMap) return []
  const list = []
  for (const [userId, info] of wsMap.entries()) {
    if (info.socketIds.size > 0 && info.status === 'online') {
      list.push({
        id: userId,
        status: info.status,
        name: info.name,
        email: info.email,
      })
    }
  }
  return list
}

io.on('connection', (socket) => {
  console.log(`[Socket.IO] New connection: ${socket.id}`)

  // 1. User Registration / Handshake
  socket.on('register_user', ({ userId, workspaceId, userName, userEmail }) => {
    if (!userId || !workspaceId) return

    socketMeta.set(socket.id, { userId, workspaceId, userName, userEmail })

    // Join rooms
    socket.join(`user:${userId}`)
    socket.join(`workspace:${workspaceId}`)

    // Clear any pending disconnect grace timer for this user
    const timerKey = `${workspaceId}:${userId}`
    if (disconnectGraceTimers.has(timerKey)) {
      clearTimeout(disconnectGraceTimers.get(timerKey))
      disconnectGraceTimers.delete(timerKey)
    }

    // Update presence registry
    if (!workspacePresence.has(workspaceId)) {
      workspacePresence.set(workspaceId, new Map())
    }
    const wsMap = workspacePresence.get(workspaceId)

    const existing = wsMap.get(userId) || {
      socketIds: new Set(),
      status: 'online',
      lastSeen: Date.now(),
      name: userName || 'User',
      email: userEmail || '',
    }

    existing.socketIds.add(socket.id)
    existing.status = 'online'
    existing.lastSeen = Date.now()
    if (userName) existing.name = userName
    if (userEmail) existing.email = userEmail
    wsMap.set(userId, existing)

    // 1. Send currently online users to the newly connected socket
    socket.emit('presence_sync', getOnlineUserIds(workspaceId))

    // 2. Broadcast online status to all workspace members
    io.to(`workspace:${workspaceId}`).emit('user_presence_changed', {
      userId,
      status: 'online',
      name: existing.name,
      email: existing.email,
    })

    console.log(`[Socket.IO] User ${userName || userId} (${userEmail}) registered in workspace ${workspaceId}`)
  })

  // 2. Channel Join & Leave
  socket.on('join_channel', ({ channelId }) => {
    if (!channelId) return
    socket.join(`channel:${channelId}`)
  })

  socket.on('leave_channel', ({ channelId }) => {
    if (!channelId) return
    socket.leave(`channel:${channelId}`)
  })

  // 3. Real-Time Chat Message (Instant 0-delay delivery)
  socket.on('send_message', (payload) => {
    const meta = socketMeta.get(socket.id)
    const { workspaceId, channelId, recipientId, content, attachments, tempId } = payload

    const messageData = {
      id: payload.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tempId,
      workspaceId: workspaceId || meta?.workspaceId,
      channelId,
      recipientId,
      senderId: meta?.userId || payload.senderId,
      senderName: meta?.userName || payload.senderName || 'Member',
      senderAvatar: payload.senderAvatar,
      content,
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
    }

    if (channelId) {
      // Broadcast to channel room (both sender and other channel members receive instantly)
      io.to(`channel:${channelId}`).emit('new_message', messageData)
    } else if (recipientId) {
      // Direct Message: Send directly to recipient room and echo back to sender room
      io.to(`user:${recipientId}`).emit('new_message', messageData)
      io.to(`user:${messageData.senderId}`).emit('new_message', messageData)
    } else if (workspaceId) {
      io.to(`workspace:${workspaceId}`).emit('new_message', messageData)
    }

    console.log(`[Socket.IO] Message delivered: channel=${channelId}, recipient=${recipientId}`)
  })

  // 4. Real-Time Typing Indicators
  socket.on('typing', ({ channelId, recipientId, isTyping }) => {
    const meta = socketMeta.get(socket.id)
    if (!meta) return

    const typingPayload = {
      userId: meta.userId,
      userName: meta.userName,
      channelId,
      recipientId,
      isTyping: Boolean(isTyping),
    }

    if (channelId) {
      socket.to(`channel:${channelId}`).emit('user_typing', typingPayload)
    } else if (recipientId) {
      socket.to(`user:${recipientId}`).emit('user_typing', typingPayload)
    }
  })

  // 5. Real-Time Task Assignments & Status Sync
  socket.on('task_assigned', (data) => {
    const { workspaceId, taskId, taskTitle, assigneeId, assignerName } = data
    if (assigneeId) {
      io.to(`user:${assigneeId}`).emit('task_assigned_notification', {
        taskId,
        taskTitle,
        assignerName,
        timestamp: new Date().toISOString(),
      })
    }
    if (workspaceId) {
      io.to(`workspace:${workspaceId}`).emit('task_updated_event', data)
    }
  })

  socket.on('task_status_changed', (data) => {
    const { workspaceId } = data
    if (workspaceId) {
      socket.to(`workspace:${workspaceId}`).emit('task_status_changed_event', data)
    }
  })

  socket.on('task_created', (data) => {
    const { workspaceId } = data
    if (workspaceId) {
      socket.to(`workspace:${workspaceId}`).emit('task_created_event', data)
    }
  })

  // 6. Presence Heartbeat
  socket.on('presence_heartbeat', ({ userId, workspaceId, status }) => {
    if (!workspaceId || !userId) return
    const wsMap = workspacePresence.get(workspaceId)
    if (!wsMap) return
    const userPresence = wsMap.get(userId)
    if (userPresence) {
      userPresence.lastSeen = Date.now()
      if (status && status !== userPresence.status) {
        userPresence.status = status
        io.to(`workspace:${workspaceId}`).emit('user_presence_changed', {
          userId,
          status,
        })
      }
    }
  })

  // 7. Explicit User Logout (Immediate Offline, No Grace Period)
  socket.on('user_logout', ({ userId, workspaceId }) => {
    if (!workspaceId || !userId) return
    const wsMap = workspacePresence.get(workspaceId)
    if (!wsMap) return
    wsMap.delete(userId)
    io.to(`workspace:${workspaceId}`).emit('user_presence_changed', {
      userId,
      status: 'offline',
    })
    console.log(`[Socket.IO] User ${userId} logged out explicitly. Marked offline immediately.`)
  })

  // 8. Socket Disconnection with Real-World Grace Period (15s for tab reload / navigation)
  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id)
    socketMeta.delete(socket.id)

    if (!meta) return

    const { userId, workspaceId } = meta
    const wsMap = workspacePresence.get(workspaceId)
    if (!wsMap) return

    const userPresence = wsMap.get(userId)
    if (!userPresence) return

    userPresence.socketIds.delete(socket.id)

    // If user has other active tabs open, they remain online
    if (userPresence.socketIds.size > 0) {
      return
    }

    // If no sockets remain, start 15s grace timer (so page refresh doesn't flicker offline)
    const timerKey = `${workspaceId}:${userId}`
    if (disconnectGraceTimers.has(timerKey)) {
      clearTimeout(disconnectGraceTimers.get(timerKey))
    }

    const timer = setTimeout(() => {
      disconnectGraceTimers.delete(timerKey)
      const currentPresence = wsMap.get(userId)
      if (currentPresence && currentPresence.socketIds.size === 0) {
        currentPresence.status = 'offline'
        io.to(`workspace:${workspaceId}`).emit('user_presence_changed', {
          userId,
          status: 'offline',
        })
        console.log(`[Socket.IO] Grace timer expired. User ${userId} marked offline.`)
      }
    }, 15000)

    disconnectGraceTimers.set(timerKey, timer)
  })
})

server.listen(PORT, () => {
  console.log(`🚀 [TaskFlow Real-Time Engine] WebSocket Server active on port ${PORT}`)
})
