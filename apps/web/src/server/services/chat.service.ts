import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'

export interface ChatChannelDto {
  id: string
  workspaceId: string
  projectId?: string
  projectName?: string
  name: string
  description?: string
  isPrivate: boolean
  memberIds: string[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessageDto {
  id: string
  workspaceId: string
  channelId?: string
  senderId: string
  senderName: string
  senderAvatar?: string
  recipientId?: string
  content: string
  attachments?: any[]
  isPinned?: boolean
  isEdited?: boolean
  deletedFor?: string[]
  createdAt: string
  updatedAt?: string
}

function parseJsonArray<T = any>(val: any): T[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

let schemaEnsured = false

export async function ensureChatSchema() {
  if (schemaEnsured) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
        project_id UUID,
        project_name VARCHAR(150),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_private BOOLEAN DEFAULT false,
        member_ids JSONB DEFAULT '[]'::jsonb,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
        channel_id UUID,
        sender_id UUID NOT NULL,
        sender_name VARCHAR(150),
        sender_avatar TEXT,
        recipient_id UUID,
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_for JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_chat_channels_ws ON chat_channels(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_dm ON chat_messages(sender_id, recipient_id);
    `)
    schemaEnsured = true
  } catch (err) {
    console.warn('[chat.service] ensureChatSchema error:', err)
  }
}

/**
 * Resolves user IDs who have access to a specific project within a workspace.
 */
export async function getMembersWithAccessToProject(workspaceId: string, projectId: string): Promise<string[]> {
  try {
    const memberSet = new Set<string>()

    // 1. Workspace creator and organization owner
    const ws = await queryOne(
      `SELECT w.created_by, o.owner_id 
       FROM workspaces w 
       LEFT JOIN organizations o ON w.organization_id = o.id 
       WHERE w.id = $1`,
      [workspaceId]
    )
    if (ws?.created_by) memberSet.add(String(ws.created_by))
    if (ws?.owner_id) memberSet.add(String(ws.owner_id))

    // 2. Project creator
    const prj = await queryOne(`SELECT created_by FROM projects WHERE id = $1`, [projectId])
    if (prj?.created_by) memberSet.add(String(prj.created_by))

    // 3. Project memberships
    const pms = await query(
      `SELECT user_id FROM project_memberships WHERE project_id = $1 AND (status = 'ACTIVE' OR status IS NULL)`,
      [projectId]
    )
    pms.forEach((r: any) => {
      if (r.user_id) memberSet.add(String(r.user_id))
    })

    // 4. Any users with accepted invitations for this project
    const invs = await query(
      `SELECT invited_user_id FROM invitations 
       WHERE (project_id = $1 OR project_ids @> jsonb_build_array($1::text)) 
       AND status = 'ACCEPTED' AND invited_user_id IS NOT NULL`,
      [projectId]
    )
    invs.forEach((r: any) => {
      if (r.invited_user_id) memberSet.add(String(r.invited_user_id))
    })

    // 5. If no specific restricted project memberships exist, all active workspace members have access
    if (pms.length === 0) {
      const wms = await query(
        `SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND (status = 'ACTIVE' OR status IS NULL)`,
        [workspaceId]
      )
      wms.forEach((r: any) => {
        if (r.user_id) memberSet.add(String(r.user_id))
      })
    }

    return Array.from(memberSet)
  } catch (err) {
    console.warn('[chat.service] getMembersWithAccessToProject error:', err)
    return []
  }
}

/**
 * Ensures a project has its own dedicated chat channel.
 * Creates it if missing and adds all members who have access to the project.
 */
export async function ensureProjectChannel(
  workspaceId: string,
  projectId: string,
  projectName: string,
  description?: string,
  creatorId?: string
): Promise<ChatChannelDto> {
  await ensureChatSchema()
  const cleanName = projectName.replace(/^#+/, '').trim()

  // Check if channel already exists for this project
  const existing = await queryOne(
    `SELECT * FROM chat_channels WHERE workspace_id = $1 AND project_id = $2 LIMIT 1`,
    [workspaceId, projectId]
  )

  if (existing) {
    // If channel exists, ensure member_ids includes members who have access
    const membersWithAccess = await getMembersWithAccessToProject(workspaceId, projectId)
    const existingMemberIds = Array.isArray(existing.member_ids) ? existing.member_ids : []
    const merged = Array.from(new Set([...existingMemberIds, ...membersWithAccess]))
    
    if (merged.length > existingMemberIds.length) {
      await query(
        `UPDATE chat_channels SET member_ids = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(merged), existing.id]
      )
    }

    return {
      id: String(existing.id),
      workspaceId: String(existing.workspace_id),
      projectId: existing.project_id ? String(existing.project_id) : undefined,
      projectName: existing.project_name || projectName,
      name: existing.name,
      description: existing.description || '',
      isPrivate: Boolean(existing.is_private),
      memberIds: merged,
      createdBy: existing.created_by ? String(existing.created_by) : undefined,
      createdAt: existing.created_at ? new Date(existing.created_at).toISOString() : new Date().toISOString(),
      updatedAt: existing.updated_at ? new Date(existing.updated_at).toISOString() : new Date().toISOString(),
    }
  }

  // Create new channel for the project
  const membersWithAccess = await getMembersWithAccessToProject(workspaceId, projectId)
  if (creatorId && !membersWithAccess.includes(creatorId)) {
    membersWithAccess.push(creatorId)
  }

  return await createChannel(workspaceId, {
    name: cleanName,
    description: description || `Dedicated channel for project #${cleanName}`,
    projectId,
    projectName,
    isPrivate: false,
    memberIds: membersWithAccess,
    createdBy: creatorId,
  })
}

/**
 * Ensures all projects in a workspace have their own dedicated channel.
 */
export async function ensureAllProjectChannels(workspaceId: string): Promise<void> {
  await ensureChatSchema()
  try {
    const projects = await query(
      `SELECT id, name, description, created_by FROM projects WHERE workspace_id = $1 AND (deleted = false OR deleted IS NULL)`,
      [workspaceId]
    )

    for (const p of projects) {
      await ensureProjectChannel(workspaceId, String(p.id), p.name, p.description, p.created_by ? String(p.created_by) : undefined)
    }
  } catch (err) {
    console.warn('[chat.service] ensureAllProjectChannels warning:', err)
  }
}

/**
 * Adds a user to a project channel and workspace general channel when invited / accepted.
 */
export async function addUserToProjectChannels(
  workspaceId: string,
  projectId: string,
  userId: string
): Promise<void> {
  await ensureChatSchema()
  try {
    // 1. Add user to project channel
    const projectChannel = await queryOne(
      `SELECT id, member_ids, name FROM chat_channels WHERE workspace_id = $1 AND project_id = $2 LIMIT 1`,
      [workspaceId, projectId]
    )

    if (projectChannel) {
      const curMembers: string[] = Array.isArray(projectChannel.member_ids) ? projectChannel.member_ids : []
      if (!curMembers.includes(userId)) {
        curMembers.push(userId)
        await query(
          `UPDATE chat_channels SET member_ids = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(curMembers), projectChannel.id]
        )

        // Seed friendly welcome announcement in channel
        const userRow = await queryOne(`SELECT first_name, last_name, display_name FROM users WHERE id = $1`, [userId])
        const userName = userRow?.display_name || `${userRow?.first_name || ''} ${userRow?.last_name || ''}`.trim() || 'A new member'
        const welcomeId = crypto.randomUUID()
        await query(
          `INSERT INTO chat_messages (id, workspace_id, channel_id, sender_id, sender_name, content, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            welcomeId,
            workspaceId,
            projectChannel.id,
            userId,
            'TaskFlow Bot',
            `👋 Welcome ${userName} to #${projectChannel.name}!`,
          ]
        )
      }
    }

    // 2. Also ensure user is in general channel
    const generalChannel = await queryOne(
      `SELECT id, member_ids FROM chat_channels WHERE workspace_id = $1 AND project_id IS NULL ORDER BY created_at ASC LIMIT 1`,
      [workspaceId]
    )
    if (generalChannel) {
      const curGenMembers: string[] = Array.isArray(generalChannel.member_ids) ? generalChannel.member_ids : []
      if (!curGenMembers.includes(userId)) {
        curGenMembers.push(userId)
        await query(
          `UPDATE chat_channels SET member_ids = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(curGenMembers), generalChannel.id]
        )
      }
    }
  } catch (err) {
    console.warn('[chat.service] addUserToProjectChannels warning:', err)
  }
}

export async function getWorkspaceChannels(workspaceId: string, currentUserId?: string): Promise<ChatChannelDto[]> {
  await ensureChatSchema()
  try {
    // 1. Ensure all projects in this workspace have dedicated channels
    await ensureAllProjectChannels(workspaceId)

    const rows = await query(
      `SELECT * FROM chat_channels WHERE workspace_id = $1 ORDER BY created_at ASC`,
      [workspaceId]
    )

    // If workspace still has 0 channels, auto-create a default '# General' channel
    if (rows.length === 0) {
      const prj = await queryOne(
        `SELECT id, name FROM projects WHERE workspace_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [workspaceId]
      )
      const projectName = prj?.name || 'Workspace'
      const defaultChannel = await createChannel(workspaceId, {
        name: 'General',
        description: `General announcements and discussion for ${projectName}`,
        projectId: prj?.id,
        projectName: projectName,
        isPrivate: false,
      })
      return [defaultChannel]
    }

    let allChannels = rows.map((r: any) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      projectId: r.project_id ? String(r.project_id) : undefined,
      projectName: r.project_name || undefined,
      name: r.name,
      description: r.description || '',
      isPrivate: Boolean(r.is_private),
      memberIds: Array.isArray(r.member_ids) ? r.member_ids : [],
      createdBy: r.created_by ? String(r.created_by) : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }))

    // 2. Filter channels by user access permissions if currentUserId is provided
    if (currentUserId) {
      try {
        const { getAllowedProjectIdsForUser } = await import('./project.service')
        const allowedProjectIds = await getAllowedProjectIdsForUser(workspaceId, currentUserId)

        if (allowedProjectIds !== null) {
          allChannels = allChannels.filter((c) => {
            // General channel is visible to all workspace members
            if (!c.projectId) return true
            // Project channel is visible if user has access to that project or is in memberIds
            if (allowedProjectIds.includes(c.projectId)) return true
            if (c.memberIds.includes(currentUserId)) return true
            return false
          })
        }
      } catch (filterErr) {
        console.warn('[chat.service] Project channel filtering fallback:', filterErr)
      }
    }

    return allChannels
  } catch (err) {
    console.error('[chat.service] getWorkspaceChannels error:', err)
    return []
  }
}

export async function createChannel(
  workspaceId: string,
  input: {
    name: string
    description?: string
    projectId?: string
    projectName?: string
    isPrivate?: boolean
    memberIds?: string[]
    createdBy?: string
  }
): Promise<ChatChannelDto> {
  await ensureChatSchema()
  const id = crypto.randomUUID()
  const now = new Date()

  // Format clean channel name: remove '#' if entered by user
  const cleanName = input.name.replace(/^#+/, '').trim()

  const row = await queryOne(
    `INSERT INTO chat_channels 
      (id, workspace_id, project_id, project_name, name, description, is_private, member_ids, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [
      id,
      workspaceId,
      input.projectId || null,
      input.projectName || null,
      cleanName,
      input.description || '',
      Boolean(input.isPrivate),
      JSON.stringify(input.memberIds || []),
      input.createdBy || null,
      now,
    ]
  )

  // Seed welcome system message in new channel
  try {
    const welcomeId = crypto.randomUUID()
    await query(
      `INSERT INTO chat_messages (id, workspace_id, channel_id, sender_id, sender_name, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        welcomeId,
        workspaceId,
        id,
        input.createdBy || '00000000-0000-0000-0000-000000000000',
        'TaskFlow Bot',
        `Welcome to #${cleanName}! ${input.description || 'This channel is ready for collaboration.'}`,
        now,
      ]
    )
  } catch {}

  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    projectId: row.project_id ? String(row.project_id) : undefined,
    projectName: row.project_name || undefined,
    name: row.name,
    description: row.description || '',
    isPrivate: Boolean(row.is_private),
    memberIds: Array.isArray(row.member_ids) ? row.member_ids : [],
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }
}

export async function getChannelMessages(channelId: string, currentUserId?: string): Promise<ChatMessageDto[]> {
  await ensureChatSchema()
  try {
    const rows = await query(
      `SELECT cm.*, COALESCE(cm.sender_avatar, u.avatar_url) AS resolved_avatar,
              COALESCE(cm.sender_name, u.display_name, u.first_name, u.email) AS resolved_name
       FROM chat_messages cm
       LEFT JOIN users u ON u.id = cm.sender_id
       WHERE cm.channel_id = $1
       ORDER BY cm.created_at ASC LIMIT 300`,
      [channelId]
    )
    return rows
      .filter((r: any) => {
        if (!currentUserId) return true
        const delArr = parseJsonArray<string>(r.deleted_for)
        return !delArr.includes(currentUserId)
      })
      .map((r: any) => ({
        id: String(r.id),
        workspaceId: String(r.workspace_id),
        channelId: String(r.channel_id),
        senderId: String(r.sender_id),
        senderName: r.resolved_name || r.sender_name || 'User',
        senderAvatar: r.resolved_avatar || r.sender_avatar || undefined,
        content: r.content,
        attachments: parseJsonArray(r.attachments),
        isPinned: Boolean(r.is_pinned),
        isEdited: Boolean(r.is_edited),
        deletedFor: parseJsonArray<string>(r.deleted_for),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
      }))
  } catch (err) {
    console.error('[chat.service] getChannelMessages error:', err)
    return []
  }
}

export async function getDirectMessages(
  workspaceId: string,
  user1Id: string,
  user2Id: string
): Promise<ChatMessageDto[]> {
  await ensureChatSchema()
  try {
    const rows = await query(
      `SELECT cm.*, COALESCE(cm.sender_avatar, u.avatar_url) AS resolved_avatar,
              COALESCE(cm.sender_name, u.display_name, u.first_name, u.email) AS resolved_name
       FROM chat_messages cm
       LEFT JOIN users u ON u.id = cm.sender_id
       WHERE cm.workspace_id = $1 
         AND cm.channel_id IS NULL
         AND ((cm.sender_id = $2 AND cm.recipient_id = $3) OR (cm.sender_id = $3 AND cm.recipient_id = $2))
       ORDER BY cm.created_at ASC LIMIT 300`,
      [workspaceId, user1Id, user2Id]
    )
    return rows
      .filter((r: any) => {
        const delArr = Array.isArray(r.deleted_for) ? r.deleted_for : []
        return !delArr.includes(user1Id)
      })
      .map((r: any) => ({
        id: String(r.id),
        workspaceId: String(r.workspace_id),
        senderId: String(r.sender_id),
        senderName: r.resolved_name || r.sender_name || 'User',
        senderAvatar: r.resolved_avatar || r.sender_avatar || undefined,
        recipientId: String(r.recipient_id),
        content: r.content,
        attachments: parseJsonArray(r.attachments),
        isPinned: Boolean(r.is_pinned),
        isEdited: Boolean(r.is_edited),
        deletedFor: parseJsonArray<string>(r.deleted_for),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
      }))
  } catch (err) {
    console.error('[chat.service] getDirectMessages error:', err)
    return []
  }
}

export async function sendMessage(
  workspaceId: string,
  input: {
    channelId?: string
    recipientId?: string
    senderId: string
    senderName: string
    senderAvatar?: string
    content: string
    attachments?: any[]
  }
): Promise<ChatMessageDto> {
  await ensureChatSchema()
  const id = crypto.randomUUID()
  const now = new Date()

  const row = await queryOne(
    `INSERT INTO chat_messages 
      (id, workspace_id, channel_id, recipient_id, sender_id, sender_name, sender_avatar, content, attachments, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      id,
      workspaceId,
      input.channelId || null,
      input.recipientId || null,
      input.senderId,
      input.senderName,
      input.senderAvatar || null,
      input.content,
      JSON.stringify(input.attachments || []),
      now,
    ]
  )

  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    channelId: row.channel_id ? String(row.channel_id) : undefined,
    recipientId: row.recipient_id ? String(row.recipient_id) : undefined,
    senderId: String(row.sender_id),
    senderName: row.sender_name || input.senderName,
    senderAvatar: row.sender_avatar || undefined,
    content: row.content,
    attachments: parseJsonArray(row.attachments),
    isPinned: Boolean(row.is_pinned),
    isEdited: Boolean(row.is_edited),
    deletedFor: parseJsonArray<string>(row.deleted_for),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  }
}

export async function editMessage(
  workspaceId: string,
  messageId: string,
  content: string,
  attachments?: any[]
): Promise<ChatMessageDto | null> {
  await ensureChatSchema()
  try {
    let row
    if (attachments !== undefined) {
      row = await queryOne(
        `UPDATE chat_messages 
         SET content = $1, attachments = $2, is_edited = true, updated_at = NOW() 
         WHERE id = $3 AND workspace_id = $4 
         RETURNING *`,
        [content, JSON.stringify(attachments), messageId, workspaceId]
      )
    } else {
      row = await queryOne(
        `UPDATE chat_messages 
         SET content = $1, is_edited = true, updated_at = NOW() 
         WHERE id = $2 AND workspace_id = $3 
         RETURNING *`,
        [content, messageId, workspaceId]
      )
    }

    if (!row) return null
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      channelId: row.channel_id ? String(row.channel_id) : undefined,
      recipientId: row.recipient_id ? String(row.recipient_id) : undefined,
      senderId: String(row.sender_id),
      senderName: row.sender_name || 'User',
      senderAvatar: row.sender_avatar || undefined,
      content: row.content,
      attachments: parseJsonArray(row.attachments),
      isPinned: Boolean(row.is_pinned),
      isEdited: Boolean(row.is_edited),
      deletedFor: parseJsonArray<string>(row.deleted_for),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }
  } catch (err) {
    console.error('[chat.service] editMessage error:', err)
    return null
  }
}

export async function togglePinMessage(
  workspaceId: string,
  messageId: string,
  isPinned: boolean
): Promise<ChatMessageDto | null> {
  await ensureChatSchema()
  try {
    const row = await queryOne(
      `UPDATE chat_messages 
       SET is_pinned = $1, updated_at = NOW() 
       WHERE id = $2 AND workspace_id = $3 
       RETURNING *`,
      [isPinned, messageId, workspaceId]
    )
    if (!row) return null
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      channelId: row.channel_id ? String(row.channel_id) : undefined,
      recipientId: row.recipient_id ? String(row.recipient_id) : undefined,
      senderId: String(row.sender_id),
      senderName: row.sender_name || 'User',
      senderAvatar: row.sender_avatar || undefined,
      content: row.content,
      attachments: parseJsonArray(row.attachments),
      isPinned: Boolean(row.is_pinned),
      isEdited: Boolean(row.is_edited),
      deletedFor: parseJsonArray<string>(row.deleted_for),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }
  } catch (err) {
    console.error('[chat.service] togglePinMessage error:', err)
    return null
  }
}

export async function deleteMessageForEveryone(
  workspaceId: string,
  messageId: string
): Promise<boolean> {
  await ensureChatSchema()
  try {
    // If message contains or references a document, delete that document from database too
    const msg = await queryOne(`SELECT * FROM chat_messages WHERE id = $1`, [messageId])
    if (msg) {
      const attachments = parseJsonArray(msg.attachments)
      for (const a of attachments) {
        if (a && (a.type === 'doc' || a.type === 'gdoc' || Boolean(a.docId))) {
          const docId = a.docId || a.title
          if (docId) {
            try {
              const { deleteWorkspaceDoc } = await import('./doc.service')
              await deleteWorkspaceDoc(workspaceId, String(docId))
            } catch (docErr) {
              console.error('[chat.service] failed to delete attached doc from db:', docErr)
            }
          }
        }
      }
      if (typeof msg.content === 'string') {
        const docMatch = msg.content.match(/\/(?:create\s+doc|doc)\s+([^\n]+)/i)
        if (docMatch && docMatch[1]) {
          try {
            const { deleteWorkspaceDoc } = await import('./doc.service')
            await deleteWorkspaceDoc(workspaceId, docMatch[1].trim())
          } catch (docErr) {
            console.error('[chat.service] failed to delete matched doc from db:', docErr)
          }
        }
      }
    }

    // Delete from DB completely with no trace
    await query(
      `DELETE FROM chat_messages WHERE id = $1 AND workspace_id = $2`,
      [messageId, workspaceId]
    )
    return true
  } catch (err) {
    console.error('[chat.service] deleteMessageForEveryone error:', err)
    return false
  }
}

export async function deleteMessageForMe(
  workspaceId: string,
  messageId: string,
  userId: string
): Promise<boolean> {
  await ensureChatSchema()
  try {
    await query(
      `UPDATE chat_messages 
       SET deleted_for = (
         CASE 
           WHEN deleted_for IS NULL OR jsonb_typeof(deleted_for) != 'array' THEN jsonb_build_array($1::text)
           WHEN deleted_for @> jsonb_build_array($1::text) THEN deleted_for
           ELSE deleted_for || jsonb_build_array($1::text)
         END
       )
       WHERE id = $2 AND workspace_id = $3`,
      [userId, messageId, workspaceId]
    )
    return true
  } catch (err) {
    console.error('[chat.service] deleteMessageForMe error:', err)
    return false
  }
}

export async function deleteMessagesBulkForEveryone(
  workspaceId: string,
  messageIds: string[]
): Promise<boolean> {
  if (!messageIds || messageIds.length === 0) return true
  await ensureChatSchema()
  try {
    // Find all documents attached to these messages and delete them
    const rows = await query(
      `SELECT id, content, attachments FROM chat_messages WHERE id = ANY($1) AND workspace_id = $2`,
      [messageIds, workspaceId]
    )
    for (const msg of rows) {
      const attachments = parseJsonArray(msg.attachments)
      for (const a of attachments) {
        if (a && (a.type === 'doc' || a.type === 'gdoc' || Boolean(a.docId))) {
          const docId = a.docId || a.title
          if (docId) {
            try {
              const { deleteWorkspaceDoc } = await import('./doc.service')
              await deleteWorkspaceDoc(workspaceId, String(docId))
            } catch (docErr) {
              console.error('[chat.service] failed to delete attached doc from db in bulk:', docErr)
            }
          }
        }
      }
      if (typeof msg.content === 'string') {
        const docMatch = msg.content.match(/\/(?:create\s+doc|doc)\s+([^\n]+)/i)
        if (docMatch && docMatch[1]) {
          try {
            const { deleteWorkspaceDoc } = await import('./doc.service')
            await deleteWorkspaceDoc(workspaceId, docMatch[1].trim())
          } catch (docErr) {
            console.error('[chat.service] failed to delete matched doc from db in bulk:', docErr)
          }
        }
      }
    }

    // Single SQL DELETE for all messages
    await query(
      `DELETE FROM chat_messages WHERE id = ANY($1) AND workspace_id = $2`,
      [messageIds, workspaceId]
    )
    return true
  } catch (err) {
    console.error('[chat.service] deleteMessagesBulkForEveryone error:', err)
    return false
  }
}

export async function deleteMessagesBulkForMe(
  workspaceId: string,
  messageIds: string[],
  userId: string
): Promise<boolean> {
  if (!messageIds || messageIds.length === 0) return true
  await ensureChatSchema()
  try {
    await query(
      `UPDATE chat_messages 
       SET deleted_for = (
         CASE 
           WHEN deleted_for IS NULL OR jsonb_typeof(deleted_for) != 'array' THEN jsonb_build_array($1::text)
           WHEN deleted_for @> jsonb_build_array($1::text) THEN deleted_for
           ELSE deleted_for || jsonb_build_array($1::text)
         END
       )
       WHERE id = ANY($2) AND workspace_id = $3`,
      [userId, messageIds, workspaceId]
    )
    return true
  } catch (err) {
    console.error('[chat.service] deleteMessagesBulkForMe error:', err)
    return false
  }
}
