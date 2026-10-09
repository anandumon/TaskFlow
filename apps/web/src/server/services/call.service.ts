import { query, queryOne } from '../db/postgres'
import { broadcastCallEvent } from '../events/call-events'
import { presenceRegistry } from './presence.service'
import crypto from 'crypto'
import { AccessToken } from 'livekit-server-sdk'

export type CallType =
  | 'ONE_TO_ONE_VOICE'
  | 'ONE_TO_ONE_VIDEO'
  | 'GROUP_VOICE'
  | 'GROUP_VIDEO'
  | 'CHANNEL_CALL'

export type CallStatus =
  | 'CREATED'
  | 'RINGING'
  | 'ACTIVE'
  | 'ENDING'
  | 'ENDED'
  | 'CANCELLED'
  | 'DECLINED'
  | 'MISSED'
  | 'EXPIRED'

export type ParticipantStatus =
  | 'INVITED'
  | 'RINGING'
  | 'ACCEPTED'
  | 'JOINED'
  | 'LEFT'
  | 'DECLINED'
  | 'REMOVED'
  | 'MISSED'

export type ParticipantRole = 'HOST' | 'CO_HOST' | 'MODERATOR' | 'PARTICIPANT' | 'VIEWER'

export interface CallSessionDto {
  id: string
  workspaceId: string
  organizationId?: string
  channelId?: string
  conversationId?: string
  roomName: string
  callType: CallType
  status: CallStatus
  createdBy: string
  createdByName?: string
  createdByAvatar?: string
  startedAt?: string
  endedAt?: string
  endedBy?: string
  maxParticipants: number
  currentParticipants: number
  encryptionEnabled: boolean
  isE2EE: boolean
  encryptionKeyVersion: number
  createdAt: string
  updatedAt: string
  participants?: CallParticipantDto[]
}

export interface CallParticipantDto {
  id: string
  callSessionId: string
  userId: string
  name: string
  email?: string
  avatarUrl?: string
  deviceId?: string
  role: ParticipantRole
  status: ParticipantStatus
  canPublish: boolean
  canSubscribe: boolean
  canScreenShare: boolean
  isMuted: boolean
  isVideoOff: boolean
  joinedAt?: string
  leftAt?: string
}

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey'
const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET || 'secret_taskflow_livekit_production_2026'
const LIVEKIT_URL =
  process.env.LIVEKIT_URL ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL ||
  'wss://livekit.taskflow.domain'

/**
 * Resolves an identifier (users.id, auth_user_id, email, workspace_members.id, organization_members.id)
 * to a canonical user record.
 */
export async function resolveUser(identifier?: string): Promise<{
  id: string
  email: string
  name: string
  avatarUrl?: string
} | null> {
  if (!identifier) return null
  const clean = identifier.trim()

  // 1. Match users by id or auth_user_id
  let user = await queryOne(
    `SELECT id, email, display_name, first_name, last_name, avatar_url, auth_user_id 
     FROM users 
     WHERE id = $1 OR auth_user_id = $1 
     LIMIT 1`,
    [clean]
  )

  // 2. Match by email
  if (!user && clean.includes('@')) {
    user = await queryOne(
      `SELECT id, email, display_name, first_name, last_name, avatar_url, auth_user_id 
       FROM users 
       WHERE LOWER(email) = LOWER($1) 
       LIMIT 1`,
      [clean]
    )
  }

  // 3. Match workspace_members.id
  if (!user) {
    user = await queryOne(
      `SELECT u.id, u.email, u.display_name, u.first_name, u.last_name, u.avatar_url, u.auth_user_id
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.id = $1
       LIMIT 1`,
      [clean]
    )
  }

  // 4. Match organization_members.id
  if (!user) {
    user = await queryOne(
      `SELECT u.id, u.email, u.display_name, u.first_name, u.last_name, u.avatar_url, u.auth_user_id
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.id = $1
       LIMIT 1`,
      [clean]
    )
  }

  if (user) {
    return {
      id: user.id,
      email: (user.email || '').toLowerCase().trim(),
      name:
        user.display_name ||
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        user.email ||
        'User',
      avatarUrl: user.avatar_url,
    }
  }

  return null
}

/**
 * Checks whether a user is currently online using presence registry with heartbeat TTL (90s).
 * Supports lookup by userId or email, and supports both 'online' and 'away' states.
 */
export function isUserOnline(userIdOrEmail?: string, email?: string): boolean {
  if (!userIdOrEmail && !email) return false
  const targetId = userIdOrEmail?.trim().toLowerCase()
  const targetEmail = (email || (userIdOrEmail?.includes('@') ? userIdOrEmail : '')).trim().toLowerCase()

  const now = Date.now()
  // 90s grace window accommodates browser background-tab timer throttling (which slows heartbeats to 60s)
  const TTL = 90000

  // 1. Direct Map key lookup
  if (userIdOrEmail) {
    const entry = presenceRegistry.get(userIdOrEmail)
    if (entry && (entry.status === 'online' || entry.status === 'away')) {
      if (now - entry.lastSeen <= TTL) return true
    }
  }

  // 2. Iterate registry entries matching ID or email
  let isFoundOnline = false
  presenceRegistry.forEach((entry) => {
    if (isFoundOnline) return
    const idMatches = Boolean(
      targetId && (entry.userId === userIdOrEmail || entry.userId.toLowerCase() === targetId)
    )
    const emailMatches = Boolean(
      targetEmail && entry.email && entry.email.toLowerCase() === targetEmail
    )
    if (idMatches || emailMatches) {
      if ((entry.status === 'online' || entry.status === 'away') && now - entry.lastSeen <= TTL) {
        isFoundOnline = true
      }
    }
  })

  return isFoundOnline
}

/**
 * Generates an ephemeral cryptographic 256-bit key for E2EE media streams
 */
function generateE2eeKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Initiates a new Call Session with strict Online-Only enforcement
 */
export async function createCall(
  workspaceId: string,
  caller: { id: string; name: string; avatarUrl?: string },
  options: {
    callType: CallType
    recipientId?: string
    channelId?: string
    isE2EE?: boolean
  }
): Promise<{ success: boolean; callSession?: CallSessionDto; error?: string; code?: string }> {
  // 1. Caller Terms & Conditions Check: Ensure caller has not declined terms
  try {
    const callerTerms = await queryOne(
      `SELECT status FROM user_terms_acceptance WHERE user_id = $1 LIMIT 1`,
      [caller.id]
    )
    if (callerTerms && callerTerms.status === 'DECLINED') {
      return {
        success: false,
        error: 'You have declined the Terms and Conditions. Voice and video calling features are disabled until you accept them in Settings.',
        code: 'CALLER_TERMS_DECLINED',
      }
    }
  } catch {}

  // 2. Caller Online Check
  // Note: we ensure caller is marked online in registry
  if (!isUserOnline(caller.id)) {
    // If presence registry doesn't have it yet, allow if authenticated, but record presence
    presenceRegistry.set(caller.id, {
      userId: caller.id,
      name: caller.name,
      email: '',
      workspaceId,
      status: 'online',
      lastSeen: Date.now(),
    })
  }

  // 3. Online Presence & Terms Check for 1-on-1 Calls: Recipient MUST have accepted terms!
  const isOneToOne =
    options.callType === 'ONE_TO_ONE_VOICE' || options.callType === 'ONE_TO_ONE_VIDEO'

  if (isOneToOne) {
    if (!options.recipientId) {
      return { success: false, error: 'Recipient ID is required for 1-on-1 calls', code: 'INVALID_RECIPIENT' }
    }

    // Resolve canonical recipient user (supports ID, auth_user_id, email, or member ID)
    const resolvedRecipient = await resolveUser(options.recipientId)
    const recipientCanonicalId = resolvedRecipient ? resolvedRecipient.id : options.recipientId
    const recipientEmail = resolvedRecipient?.email || ''

    if (recipientCanonicalId === caller.id) {
      return { success: false, error: 'Cannot call yourself', code: 'SELF_CALL' }
    }

    // Check if recipient has declined Terms & Conditions
    try {
      const recipientTerms = await queryOne(
        `SELECT status FROM user_terms_acceptance WHERE user_id = $1 OR user_id = $2 LIMIT 1`,
        [recipientCanonicalId, options.recipientId]
      )
      if (recipientTerms && recipientTerms.status === 'DECLINED') {
        const nameToShow = resolvedRecipient?.name || 'This user'
        return {
          success: false,
          error: `${nameToShow} has declined the Terms and Conditions and cannot participate in voice or video calls.`,
          code: 'RECIPIENT_TERMS_DECLINED',
        }
      }
    } catch {}

    // Check if recipient is online in presence registry (checking canonical ID, original recipientId, and email)
    let recipientOnline =
      isUserOnline(recipientCanonicalId, recipientEmail) ||
      isUserOnline(options.recipientId, recipientEmail)

    // Fallback: check recent activity (within 5 minutes) in registry or DB if presence map reset or background tab
    if (!recipientOnline) {
      presenceRegistry.forEach((entry) => {
        if (recipientOnline) return
        const idMatches = entry.userId === recipientCanonicalId || entry.userId === options.recipientId
        const emailMatches = Boolean(recipientEmail && entry.email && entry.email.toLowerCase() === recipientEmail)
        if ((idMatches || emailMatches) && Date.now() - entry.lastSeen <= 300000) {
          recipientOnline = true
        }
      })

      if (!recipientOnline && recipientCanonicalId) {
        try {
          const recentDb = await queryOne(
            `SELECT 1 FROM users WHERE id = $1 AND updated_at >= NOW() - INTERVAL '10 minutes' LIMIT 1`,
            [recipientCanonicalId]
          )
          if (recentDb) recipientOnline = true
        } catch {}
      }
    }

    // NOTE: We intentionally removed the hard RECIPIENT_OFFLINE gate here.
    // Presence is best-effort and can be stale (background tabs, mobile, VPN, etc.).
    // If the recipient is truly unreachable, the 45-second ring timeout will expire the call
    // and mark it as MISSED. This is a better UX than a false "user is offline" error.

    // Verify recipient belongs to this workspace OR the workspace's organization
    const membership = await queryOne(
      `SELECT wm.id AS wm_id, NULL AS om_id
       FROM workspace_members wm 
       WHERE wm.workspace_id = $1 AND wm.user_id = $2
       UNION
       SELECT NULL AS wm_id, om.id AS om_id
       FROM organization_members om
       JOIN workspaces w ON w.organization_id = om.organization_id
       WHERE w.id = $1 AND om.user_id = $2
       LIMIT 1`,
      [workspaceId, recipientCanonicalId]
    )

    if (!membership) {
      return {
        success: false,
        error: 'Recipient is not a member of this workspace or organization',
        code: 'NOT_WORKSPACE_MEMBER',
      }
    }

    // If recipient is an org member but not yet in workspace_members, auto-add to workspace_members
    if (!membership.wm_id) {
      try {
        await query(
          `INSERT INTO workspace_members (id, workspace_id, user_id, role_id, created_at, updated_at)
           VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = 'Member' LIMIT 1), NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [crypto.randomUUID(), workspaceId, recipientCanonicalId]
        )
      } catch (e) {
        console.warn('[call.service] Auto-add to workspace_members notice:', e)
      }
    }

    // Canonicalize options.recipientId for consistent database insertion and matching
    options.recipientId = recipientCanonicalId
  }

  // 3. Expire any stale ringing calls before checking for active duplicates
  await expireStaleRingingCalls(workspaceId)

  // Prevent duplicate active calls between same two users in 1-on-1
  if (isOneToOne && options.recipientId) {
    const existingActive = await queryOne(
      `SELECT cs.* FROM call_sessions cs
       JOIN call_participants cp ON cp.call_session_id = cs.id
       WHERE cs.workspace_id = $1 
         AND cs.status IN ('CREATED', 'RINGING', 'ACTIVE')
         AND ((cs.created_by = $2 AND cp.user_id = $3) OR (cs.created_by = $3 AND cp.user_id = $2))
       LIMIT 1`,
      [workspaceId, caller.id, options.recipientId]
    )

    if (existingActive) {
      const full = await getCallSession(existingActive.id)
      if (full) return { success: true, callSession: full }
    }
  }

  // 4. Create Room Name and Database Records
  const roomName = `tf-room-${workspaceId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`
  const conversationId = isOneToOne && options.recipientId
    ? [caller.id, options.recipientId].sort().join(':')
    : undefined
  const initialE2eeKey = generateE2eeKey()
  const isE2EE = options.isE2EE !== false

  let callId: string

  // Atomic database transaction
  await query('BEGIN')
  try {
    const sessionRow = await queryOne(
      `INSERT INTO call_sessions (
         workspace_id, channel_id, conversation_id, room_name,
         call_type, status, created_by, max_participants,
         current_participants, encryption_enabled, is_e2ee,
         encryption_key_version, e2ee_key, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'RINGING', $6, $7, 1, true, $8, 1, $9, NOW(), NOW())
       RETURNING id`,
      [
        workspaceId,
        options.channelId || null,
        conversationId || null,
        roomName,
        options.callType,
        caller.id,
        isOneToOne ? 2 : 50,
        isE2EE,
        initialE2eeKey,
      ]
    )

    callId = sessionRow.id

    // 5. Insert Caller as HOST (status: JOINED since caller initiates and hosts the call)
    await query(
      `INSERT INTO call_participants (
         call_session_id, user_id, role, status,
         can_publish, can_subscribe, can_screen_share,
         created_at, updated_at
       ) VALUES ($1, $2, 'HOST', 'JOINED', true, true, true, NOW(), NOW())`,
      [callId, caller.id]
    )

    // 6. Insert Recipient if 1-on-1
    if (isOneToOne && options.recipientId) {
      await query(
        `INSERT INTO call_participants (
           call_session_id, user_id, role, status,
           can_publish, can_subscribe, can_screen_share,
           created_at, updated_at
         ) VALUES ($1, $2, 'PARTICIPANT', 'RINGING', true, true, true, NOW(), NOW())`,
        [callId, options.recipientId]
      )
    }

    // 7. Audit log event
    await query(
      `INSERT INTO call_events (call_session_id, user_id, event_type, metadata)
       VALUES ($1, $2, 'CALL_CREATED', $3)`,
      [callId, caller.id, JSON.stringify({ callType: options.callType, isE2EE })]
    )

    await query('COMMIT')
  } catch (err) {
    await query('ROLLBACK')
    throw err
  }

  const callSession = await getCallSession(callId)
  if (!callSession) {
    return { success: false, error: 'Failed to retrieve created call session' }
  }

  // 8. Real-time Signaling Dispatch
  broadcastCallEvent({
    type: 'call_incoming',
    workspaceId,
    callId,
    callerId: caller.id,
    recipientId: options.recipientId,
    channelId: options.channelId,
    timestamp: new Date().toISOString(),
    data: {
      callSession,
      caller: {
        id: caller.id,
        name: caller.name,
        avatarUrl: caller.avatarUrl,
      },
    },
  })

  return { success: true, callSession }
}

/**
 * Retrieves full call session with populated participants
 */
export async function getCallSession(callId: string): Promise<CallSessionDto | null> {
  const session = await queryOne(
    `SELECT cs.*, 
            u.display_name AS creator_display_name,
            u.first_name AS creator_first_name,
            u.last_name AS creator_last_name,
            u.avatar_url AS creator_avatar_url
     FROM call_sessions cs
     LEFT JOIN users u ON u.id = cs.created_by
     WHERE cs.id = $1 LIMIT 1`,
    [callId]
  )
  if (!session) return null

  const participantsRows = await query(
    `SELECT cp.*,
            u.display_name, u.first_name, u.last_name, u.email, u.avatar_url
     FROM call_participants cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.call_session_id = $1
     ORDER BY cp.created_at ASC`,
    [callId]
  )

  const participants: CallParticipantDto[] = participantsRows.map((r) => ({
    id: r.id,
    callSessionId: r.call_session_id,
    userId: r.user_id,
    name: r.display_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Member',
    email: r.email,
    avatarUrl: r.avatar_url,
    deviceId: r.device_id,
    role: r.role,
    status: r.status,
    canPublish: r.can_publish,
    canSubscribe: r.can_subscribe,
    canScreenShare: r.can_screen_share,
    isMuted: r.is_muted,
    isVideoOff: r.is_video_off,
    joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : undefined,
    leftAt: r.left_at ? new Date(r.left_at).toISOString() : undefined,
  }))

  const creatorName =
    session.creator_display_name ||
    `${session.creator_first_name || ''} ${session.creator_last_name || ''}`.trim() ||
    'Member'

  return {
    id: session.id,
    workspaceId: session.workspace_id,
    organizationId: session.organization_id,
    channelId: session.channel_id,
    conversationId: session.conversation_id,
    roomName: session.room_name,
    callType: session.call_type,
    status: session.status,
    createdBy: session.created_by,
    createdByName: creatorName,
    createdByAvatar: session.creator_avatar_url,
    startedAt: session.started_at ? new Date(session.started_at).toISOString() : undefined,
    endedAt: session.ended_at ? new Date(session.ended_at).toISOString() : undefined,
    endedBy: session.ended_by,
    maxParticipants: session.max_participants,
    currentParticipants: session.current_participants,
    encryptionEnabled: session.encryption_enabled,
    isE2EE: session.is_e2ee,
    encryptionKeyVersion: session.encryption_key_version,
    createdAt: new Date(session.created_at).toISOString(),
    updatedAt: new Date(session.updated_at).toISOString(),
    participants,
  }
}

/**
 * Responds to an incoming call (ACCEPT or DECLINE)
 */
export async function respondToCall(
  callId: string,
  userId: string,
  action: 'ACCEPT' | 'DECLINE'
): Promise<{ success: boolean; callSession?: CallSessionDto; error?: string }> {
  const session = await queryOne(`SELECT * FROM call_sessions WHERE id = $1 LIMIT 1`, [callId])
  if (!session) return { success: false, error: 'Call not found' }

  const TERMINAL_STATUSES = ['ENDED', 'CANCELLED', 'DECLINED', 'MISSED', 'EXPIRED']
  if (TERMINAL_STATUSES.includes(session.status)) {
    return { success: false, error: 'Call has already ended or expired' }
  }

  // 1. Participant Authorization Guard
  const participant = await queryOne(
    `SELECT * FROM call_participants WHERE call_session_id = $1 AND user_id = $2 LIMIT 1`,
    [callId, userId]
  )
  if (!participant) {
    return { success: false, error: 'Unauthorized: User is not a participant of this call' }
  }

  if (action === 'ACCEPT') {
    // Idempotent: If user has already joined/accepted, return current session without double incrementing
    if (participant.status === 'JOINED' || participant.status === 'ACCEPTED') {
      const full = await getCallSession(callId)
      return { success: true, callSession: full || undefined }
    }

    await query(
      `UPDATE call_participants 
       SET status = 'JOINED', joined_at = NOW(), updated_at = NOW() 
       WHERE call_session_id = $1 AND user_id = $2`,
      [callId, userId]
    )

    // Also update host/caller to JOINED
    await query(
      `UPDATE call_participants 
       SET status = 'JOINED', joined_at = COALESCE(joined_at, NOW()), updated_at = NOW() 
       WHERE call_session_id = $1 AND role = 'HOST'`,
      [callId]
    )

    await query(
      `UPDATE call_sessions 
       SET status = 'ACTIVE', started_at = COALESCE(started_at, NOW()), 
           current_participants = current_participants + 1, updated_at = NOW() 
       WHERE id = $1`,
      [callId]
    )

    await query(
      `INSERT INTO call_events (call_session_id, user_id, event_type) VALUES ($1, $2, 'CALL_ACCEPTED')`,
      [callId, userId]
    )

    const updated = await getCallSession(callId)
    if (updated) {
      broadcastCallEvent({
        type: 'call_accepted',
        workspaceId: updated.workspaceId,
        callId,
        callerId: updated.createdBy,
        recipientId: userId,
        timestamp: new Date().toISOString(),
        data: { callSession: updated },
      })
    }
    return { success: true, callSession: updated || undefined }
  } else {
    // DECLINE
    const isOneToOne = session.call_type === 'ONE_TO_ONE_VOICE' || session.call_type === 'ONE_TO_ONE_VIDEO'

    await query(
      `UPDATE call_participants 
       SET status = 'DECLINED', left_at = NOW(), updated_at = NOW() 
       WHERE call_session_id = $1 AND user_id = $2`,
      [callId, userId]
    )

    // For 1-on-1 calls, declining ends the call session.
    // For group or channel calls, declining only removes that participant without killing the group call.
    if (isOneToOne) {
      await query(
        `UPDATE call_sessions 
         SET status = 'DECLINED', ended_at = NOW(), ended_by = $2, current_participants = 0, updated_at = NOW() 
         WHERE id = $1`,
        [callId, userId]
      )
    } else {
      await query(
        `UPDATE call_sessions 
         SET current_participants = GREATEST(0, current_participants - 1), updated_at = NOW() 
         WHERE id = $1`,
        [callId]
      )
    }

    await query(
      `INSERT INTO call_events (call_session_id, user_id, event_type) VALUES ($1, $2, 'CALL_DECLINED')`,
      [callId, userId]
    )

    const updated = await getCallSession(callId)
    if (updated) {
      broadcastCallEvent({
        type: 'call_declined',
        workspaceId: updated.workspaceId,
        callId,
        callerId: updated.createdBy,
        recipientId: userId,
        timestamp: new Date().toISOString(),
        data: { callSession: updated },
      })
    }
    return { success: true, callSession: updated || undefined }
  }
}

/**
 * Generates short-lived, cryptographically signed LiveKit Access Token
 */
export async function generateLiveKitToken(
  callId: string,
  user: { id: string; name: string; avatarUrl?: string },
  role: ParticipantRole = 'PARTICIPANT'
): Promise<{ token: string; serverUrl: string; roomName: string; e2eeKeyVersion: number }> {
  const session = await queryOne(`SELECT * FROM call_sessions WHERE id = $1 LIMIT 1`, [callId])
  if (!session) throw new Error('Call session not found')

  const TERMINAL_STATUSES = ['ENDED', 'CANCELLED', 'DECLINED', 'MISSED', 'EXPIRED']
  if (TERMINAL_STATUSES.includes(session.status)) {
    throw new Error('Call has already ended')
  }

  // Participant authorization guard
  const participant = await queryOne(
    `SELECT * FROM call_participants WHERE call_session_id = $1 AND user_id = $2 LIMIT 1`,
    [callId, user.id]
  )
  if (!participant && session.created_by !== user.id) {
    throw new Error('Unauthorized: User is not a participant of this call')
  }

  // Terms & Conditions guard
  try {
    const terms = await queryOne(
      `SELECT status FROM user_terms_acceptance WHERE user_id = $1 LIMIT 1`,
      [user.id]
    )
    if (terms && terms.status === 'DECLINED') {
      throw new Error('You have declined the Terms and Conditions. Voice and video calling features are disabled until you accept them in Settings.')
    }
  } catch (err: any) {
    if (err.message?.includes('declined the Terms and Conditions')) throw err
  }

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials are not configured on the server')
  }

  // Token valid for 10 minutes
  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.name,
    metadata: JSON.stringify({
      avatarUrl: user.avatarUrl,
      role,
      isE2EE: session.is_e2ee,
    }),
    ttl: '10m',
  })

  at.addGrant({
    roomJoin: true,
    room: session.room_name,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  const token = await at.toJwt()

  return {
    token,
    serverUrl: LIVEKIT_URL,
    roomName: session.room_name,
    e2eeKeyVersion: session.encryption_key_version || 1,
  }
}

/**
 * Delivers ephemeral E2EE key to authorized participants only
 */
export async function getE2eeKey(
  callId: string,
  userId: string
): Promise<{ keyVersion: number; key: string } | null> {
  const participant = await queryOne(
    `SELECT * FROM call_participants WHERE call_session_id = $1 AND user_id = $2 LIMIT 1`,
    [callId, userId]
  )
  if (!participant || participant.status === 'REMOVED' || participant.status === 'DECLINED') {
    return null
  }

  const session = await queryOne(`SELECT * FROM call_sessions WHERE id = $1 LIMIT 1`, [callId])
  if (!session || !session.is_e2ee || !session.e2ee_key) return null

  return {
    keyVersion: session.encryption_key_version || 1,
    key: session.e2ee_key,
  }
}

/**
 * Ends a call session gracefully
 */
export async function endCall(
  callId: string,
  userId: string,
  reason = 'USER_HANGUP'
): Promise<{ success: boolean; callSession?: CallSessionDto; error?: string }> {
  const session = await queryOne(`SELECT * FROM call_sessions WHERE id = $1 LIMIT 1`, [callId])
  if (!session) return { success: false, error: 'Call session not found' }

  // Participant authorization guard
  const participant = await queryOne(
    `SELECT * FROM call_participants WHERE call_session_id = $1 AND user_id = $2 LIMIT 1`,
    [callId, userId]
  )
  if (session.created_by !== userId && !participant) {
    return { success: false, error: 'Unauthorized to end call' }
  }

  // If caller hangs up while still RINGING, mark as CANCELLED instead of ENDED
  const finalStatus = (session.status === 'RINGING' && session.created_by === userId) ? 'CANCELLED' : 'ENDED'

  await query(
    `UPDATE call_sessions 
     SET status = $2, ended_at = NOW(), ended_by = $3, current_participants = 0, updated_at = NOW() 
     WHERE id = $1`,
    [callId, finalStatus, userId]
  )

  await query(
    `UPDATE call_participants 
     SET status = 'LEFT', left_at = NOW(), updated_at = NOW() 
     WHERE call_session_id = $1 AND status IN ('RINGING', 'ACCEPTED', 'JOINED', 'INVITED')`,
    [callId]
  )

  await query(
    `INSERT INTO call_events (call_session_id, user_id, event_type, metadata)
     VALUES ($1, $2, $3, $4)`,
    [callId, userId, finalStatus === 'CANCELLED' ? 'CALL_CANCELLED' : 'CALL_ENDED', JSON.stringify({ reason })]
  )

  const updated = await getCallSession(callId)
  if (updated) {
    broadcastCallEvent({
      type: 'call_ended',
      workspaceId: updated.workspaceId,
      callId,
      callerId: updated.createdBy,
      timestamp: new Date().toISOString(),
      data: { callSession: updated, reason, status: finalStatus },
    })
  }

  return { success: true, callSession: updated || undefined }
}

/**
 * Automatically expires any ringing calls that have exceeded the 45-second ring timeout
 */
export async function expireStaleRingingCalls(workspaceId?: string): Promise<void> {
  try {
    const staleRows = await query(
      `SELECT cs.id, cs.workspace_id, cs.created_by
       FROM call_sessions cs
       WHERE cs.status = 'RINGING'
         AND cs.created_at < NOW() - INTERVAL '45 seconds'
         ${workspaceId ? 'AND cs.workspace_id = $1' : ''}`,
      workspaceId ? [workspaceId] : []
    )

    for (const row of staleRows) {
      await query(
        `UPDATE call_sessions
         SET status = 'MISSED', ended_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [row.id]
      )

      await query(
        `UPDATE call_participants
         SET status = 'MISSED', left_at = NOW(), updated_at = NOW()
         WHERE call_session_id = $1 AND status IN ('INVITED', 'RINGING')`,
        [row.id]
      )

      await query(
        `INSERT INTO call_events (call_session_id, user_id, event_type, metadata)
         VALUES ($1, $2, 'CALL_MISSED', $3)`,
        [row.id, row.created_by, JSON.stringify({ reason: 'RING_TIMEOUT' })]
      )

      broadcastCallEvent({
        type: 'call_ended',
        workspaceId: row.workspace_id,
        callId: row.id,
        callerId: row.created_by,
        timestamp: new Date().toISOString(),
        data: { reason: 'RING_TIMEOUT' },
      })
    }
  } catch (err) {
    console.warn('[call.service] expireStaleRingingCalls warning:', err)
  }
}

/**
 * Finds any active incoming call for a given user where status is 'RINGING'
 */
export async function getIncomingCallForUser(userId: string): Promise<{
  callSession: CallSessionDto
  caller: { id: string; name: string; avatarUrl?: string }
} | null> {
  await expireStaleRingingCalls()

  const row = await queryOne(
    `SELECT cs.id, cs.created_by,
            u.display_name AS caller_display_name,
            u.first_name AS caller_first_name,
            u.last_name AS caller_last_name,
            u.avatar_url AS caller_avatar_url
     FROM call_sessions cs
     JOIN call_participants cp ON cp.call_session_id = cs.id
     JOIN users u ON u.id = cs.created_by
     WHERE cp.user_id = $1 
       AND cp.status = 'RINGING'
       AND cs.status = 'RINGING'
       AND cs.created_by != $1
       AND cp.role != 'HOST'
     ORDER BY cs.created_at DESC
     LIMIT 1`,
    [userId]
  )

  if (!row) return null

  const callSession = await getCallSession(row.id)
  if (!callSession) return null

  const callerName =
    row.caller_display_name ||
    `${row.caller_first_name || ''} ${row.caller_last_name || ''}`.trim() ||
    'Caller'

  return {
    callSession,
    caller: {
      id: row.created_by,
      name: callerName,
      avatarUrl: row.caller_avatar_url,
    },
  }
}

