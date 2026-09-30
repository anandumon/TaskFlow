import { query, queryOne } from '@/server/db/postgres'
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

export async function getWorkspaceChannels(workspaceId: string): Promise<ChatChannelDto[]> {
  await ensureChatSchema()
  try {
    const rows = await query(
      `SELECT * FROM chat_channels WHERE workspace_id = $1 ORDER BY created_at ASC`,
      [workspaceId]
    )

    // If workspace has no channels yet, auto-create a default '# general' channel
    if (rows.length === 0) {
      // Find workspace project name if any
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

    return rows.map((r: any) => ({
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
      `SELECT * FROM chat_messages WHERE channel_id = $1 ORDER BY created_at ASC LIMIT 300`,
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
        senderName: r.sender_name || 'User',
        senderAvatar: r.sender_avatar || undefined,
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
      `SELECT * FROM chat_messages 
       WHERE workspace_id = $1 
         AND channel_id IS NULL
         AND ((sender_id = $2 AND recipient_id = $3) OR (sender_id = $3 AND recipient_id = $2))
       ORDER BY created_at ASC LIMIT 300`,
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
        senderName: r.sender_name || 'User',
        senderAvatar: r.sender_avatar || undefined,
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
