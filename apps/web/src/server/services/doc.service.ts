import { query, queryOne } from '../db/postgres'
import { DocItem } from '@/stores/doc-store'

let docSchemaEnsured = false

export async function ensureDocSchema() {
  if (docSchemaEnsured) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS workspace_documents (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id UUID,
        title VARCHAR(255) NOT NULL,
        content TEXT DEFAULT '',
        author_name VARCHAR(150),
        author_email VARCHAR(255),
        location VARCHAR(150),
        channel_id UUID,
        recipient_id UUID,
        tags JSONB DEFAULT '[]'::jsonb,
        subpages JSONB DEFAULT '[]'::jsonb,
        starred BOOLEAN DEFAULT false,
        is_protected BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        is_wiki BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
    docSchemaEnsured = true
  } catch (err) {
    console.error('[doc.service] ensureDocSchema error:', err)
  }
}

export async function getWorkspaceDocs(workspaceId?: string): Promise<DocItem[]> {
  await ensureDocSchema()
  try {
    let rows: any[]
    if (workspaceId) {
      rows = await query(
        `SELECT * FROM workspace_documents WHERE workspace_id = $1 OR workspace_id IS NULL ORDER BY updated_at DESC`,
        [workspaceId]
      )
    } else {
      rows = await query(
        `SELECT * FROM workspace_documents ORDER BY updated_at DESC`
      )
    }

    return rows.map((r) => ({
      id: String(r.id),
      title: r.title || 'Untitled Doc',
      content: r.content || '',
      authorName: r.author_name || 'User',
      authorEmail: r.author_email || undefined,
      location: r.location || 'Team Space',
      channelId: r.channel_id ? String(r.channel_id) : undefined,
      recipientId: r.recipient_id ? String(r.recipient_id) : undefined,
      tags: Array.isArray(r.tags) ? r.tags : [],
      subpages: Array.isArray(r.subpages) ? r.subpages : [],
      starred: Boolean(r.starred),
      isProtected: Boolean(r.is_protected),
      isPublic: Boolean(r.is_public),
      isWiki: Boolean(r.is_wiki),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      viewedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }))
  } catch (err) {
    console.error('[doc.service] getWorkspaceDocs error:', err)
    return []
  }
}

export async function upsertWorkspaceDoc(workspaceId: string, doc: Partial<DocItem>): Promise<DocItem | null> {
  await ensureDocSchema()
  try {
    const id = doc.id || `doc-${Date.now().toString(36)}`
    const title = doc.title?.trim() || 'Untitled Doc'
    const content = doc.content ?? ''
    const authorName = doc.authorName || 'User'
    const authorEmail = doc.authorEmail || null
    const location = doc.location || 'Team Space'
    const channelId = doc.channelId || null
    const recipientId = doc.recipientId || null
    const tags = JSON.stringify(doc.tags || [])
    const subpages = JSON.stringify(doc.subpages || [])
    const starred = Boolean(doc.starred)
    const isProtected = Boolean(doc.isProtected)
    const isPublic = Boolean(doc.isPublic)
    const isWiki = Boolean(doc.isWiki)

    const row = await queryOne(
      `INSERT INTO workspace_documents (
        id, workspace_id, title, content, author_name, author_email, location,
        channel_id, recipient_id, tags, subpages, starred, is_protected, is_public, is_wiki, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        author_name = EXCLUDED.author_name,
        location = COALESCE(EXCLUDED.location, workspace_documents.location),
        channel_id = COALESCE(EXCLUDED.channel_id, workspace_documents.channel_id),
        recipient_id = COALESCE(EXCLUDED.recipient_id, workspace_documents.recipient_id),
        tags = EXCLUDED.tags,
        subpages = EXCLUDED.subpages,
        starred = EXCLUDED.starred,
        is_protected = EXCLUDED.is_protected,
        is_public = EXCLUDED.is_public,
        is_wiki = EXCLUDED.is_wiki,
        updated_at = NOW()
      RETURNING *`,
      [
        id,
        workspaceId || null,
        title,
        content,
        authorName,
        authorEmail,
        location,
        channelId,
        recipientId,
        tags,
        subpages,
        starred,
        isProtected,
        isPublic,
        isWiki,
      ]
    )

    if (!row) return null

    return {
      id: String(row.id),
      title: row.title,
      content: row.content,
      authorName: row.author_name,
      location: row.location,
      tags: Array.isArray(row.tags) ? row.tags : [],
      subpages: Array.isArray(row.subpages) ? row.subpages : [],
      starred: Boolean(row.starred),
      isProtected: Boolean(row.is_protected),
      isPublic: Boolean(row.is_public),
      isWiki: Boolean(row.is_wiki),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    }
  } catch (err) {
    console.error('[doc.service] upsertWorkspaceDoc error:', err)
    return null
  }
}

export async function deleteWorkspaceDoc(workspaceId: string, docId: string): Promise<boolean> {
  await ensureDocSchema()
  try {
    const cleanDocId = (docId || '').trim()
    if (!cleanDocId) return true

    if (workspaceId) {
      // 1. Delete from workspace_documents
      await query(
        `DELETE FROM workspace_documents 
         WHERE (id = $1 OR title ILIKE $1 OR title ILIKE $2) 
           AND (workspace_id = $3 OR workspace_id IS NULL)`,
        [cleanDocId, `%${cleanDocId}%`, workspaceId]
      )

      // 2. Also delete/clean from chat_messages table if attached
      await query(
        `DELETE FROM chat_messages 
         WHERE workspace_id = $1 
           AND (
             attachments::text ILIKE '%' || $2 || '%' 
             OR content ILIKE '/create doc ' || $2
             OR content ILIKE '/doc ' || $2
           )`,
        [workspaceId, cleanDocId]
      )
    } else {
      await query(
        `DELETE FROM workspace_documents 
         WHERE id = $1 OR title ILIKE $1 OR title ILIKE $2`,
        [cleanDocId, `%${cleanDocId}%`]
      )

      await query(
        `DELETE FROM chat_messages 
         WHERE attachments::text ILIKE '%' || $1 || '%' 
            OR content ILIKE '/create doc ' || $1
            OR content ILIKE '/doc ' || $1`,
        [cleanDocId]
      )
    }

    return true
  } catch (err) {
    console.error('[doc.service] deleteWorkspaceDoc error:', err)
    return false
  }
}
