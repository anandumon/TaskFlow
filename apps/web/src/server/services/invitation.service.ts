import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'
import { getAppBaseUrl } from '../utils/url'

export interface InvitationDto {
  id: string
  email: string
  organizationId?: string
  organizationName?: string
  orgName?: string
  workspaceId?: string
  workspaceName?: string
  projectId?: string
  projectName?: string
  inviterName?: string
  scope: string
  role: string
  token: string
  status: string
  expiresAt: string
  createdAt: string
}

function mapInvitation(row: any, inviterName?: string): InvitationDto {
  return {
    id: String(row.id),
    email: row.email,
    organizationId: row.organization_id ? String(row.organization_id) : undefined,
    organizationName: row.organization_name || 'Organization',
    orgName: row.organization_name || 'Organization',
    workspaceId: row.workspace_id ? String(row.workspace_id) : undefined,
    workspaceName: row.workspace_name || 'Workspace',
    projectId: row.project_id ? String(row.project_id) : undefined,
    projectName: row.project_name || 'Project',
    inviterName: inviterName || row.inviter_name || 'A team member',
    scope: row.scope || 'ORGANIZATION',
    role: row.role || 'MEMBER',
    token: row.token,
    status: row.status || 'PENDING',
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : new Date().toISOString(),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }
}

export async function createInvitation(
  creatorId: string,
  input: {
    email: string
    role?: string
    scope?: string
    organizationId?: string
    workspaceId?: string
    projectId?: string
  }
): Promise<InvitationDto> {
  const id = crypto.randomUUID()
  const token = crypto.randomBytes(24).toString('hex')
  const now = new Date()
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)

  let prjName = 'Project'
  if (input.projectId) {
    const p = await queryOne(`SELECT name, workspace_id FROM projects WHERE id = $1`, [input.projectId])
    if (p) {
      prjName = p.name
      if (!input.workspaceId && p.workspace_id) {
        input.workspaceId = p.workspace_id
      }
    }
  }

  let wsName = 'Workspace'
  if (input.workspaceId) {
    const w = await queryOne(`SELECT name, organization_id FROM workspaces WHERE id = $1`, [input.workspaceId])
    if (w) {
      wsName = w.name
      if (!input.organizationId && w.organization_id) {
        input.organizationId = w.organization_id
      }
    }
  }

  let orgName = 'Organization'
  if (input.organizationId) {
    const o = await queryOne(`SELECT name FROM organizations WHERE id = $1`, [input.organizationId])
    if (o) orgName = o.name
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const roleName = (input.role || 'Member').toLowerCase()
  let roleId: string = 'a0000000-0000-0000-0000-000000000004'
  if (roleName.includes('admin')) roleId = 'a0000000-0000-0000-0000-000000000002'
  else if (roleName.includes('manager')) roleId = 'a0000000-0000-0000-0000-000000000003'
  else if (roleName.includes('guest')) roleId = 'a0000000-0000-0000-0000-000000000005'

  const row = await queryOne(
    `INSERT INTO invitations (
      id, email, role, role_id, scope, organization_id, organization_name,
      workspace_id, workspace_name, project_id, project_name,
      token, token_hash, status, invited_by, expires_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING', $14, $15, $16, $16)
    RETURNING *`,
    [
      id,
      input.email.toLowerCase().trim(),
      input.role || 'MEMBER',
      roleId,
      input.scope || 'ORGANIZATION',
      input.organizationId || null,
      orgName,
      input.workspaceId || null,
      wsName,
      input.projectId || null,
      prjName,
      token,
      tokenHash,
      creatorId,
      expiresAt,
      now,
    ]
  )

  // Dispatch Project Invitation Email
  try {
    const inviter = await queryOne(`SELECT first_name, last_name, email FROM users WHERE id = $1`, [creatorId])
    const inviterName = inviter ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email : 'A team member'
    const appUrl = getAppBaseUrl()
    const inviteUrl = `${appUrl}/invite?token=${token}`

    const { sendProjectInvitationEmail } = await import('./email.service')
    await sendProjectInvitationEmail(
      input.email.toLowerCase().trim(),
      inviterName,
      orgName,
      wsName,
      prjName,
      inviteUrl
    )
  } catch (err: any) {
    console.error('[invitation.service] Failed to send invitation email:', err?.message || err)
  }

  return mapInvitation(row)
}

export async function getPendingInvitationsForUser(email: string): Promise<InvitationDto[]> {
  if (!email) return []
  try {
    const rows = await query(
      `SELECT * FROM invitations WHERE LOWER(email) = LOWER($1) AND status = 'PENDING'`,
      [email.trim()]
    )
    return rows.map((r) => mapInvitation(r))
  } catch (err) {
    console.warn('[invitation.service] getPendingInvitationsForUser error:', err)
    return []
  }
}

export async function getInvitationByToken(token: string): Promise<InvitationDto | null> {
  const isId = token.length === 36 && token.includes('-')
  const row = await queryOne(
    `SELECT i.*, 
            u.display_name as inviter_display_name, 
            u.first_name as inviter_first_name, 
            u.last_name as inviter_last_name, 
            u.email as inviter_email
     FROM invitations i
     LEFT JOIN users u ON i.invited_by = u.id
     WHERE ${isId ? 'i.id = $1' : 'i.token = $1 OR i.token_hash = $1'}`,
    [token]
  )
  if (!row) return null

  const inviterName =
    row.inviter_display_name ||
    `${row.inviter_first_name || ''} ${row.inviter_last_name || ''}`.trim() ||
    row.inviter_email ||
    'A team member'

  return mapInvitation(row, inviterName)
}

export async function getInvitationsForResource(
  scope: string,
  resourceId: string
): Promise<InvitationDto[]> {
  try {
    let sql = `SELECT * FROM invitations WHERE status = 'PENDING'`
    const params = [resourceId]

    if (scope === 'ORGANIZATION') {
      sql += ` AND (
        organization_id = $1 
        OR workspace_id IN (SELECT id FROM workspaces WHERE organization_id = $1)
        OR project_id IN (SELECT p.id FROM projects p JOIN workspaces w ON p.workspace_id = w.id WHERE w.organization_id = $1)
      )`
    } else if (scope === 'WORKSPACE') {
      sql += ` AND workspace_id = $1`
    } else if (scope === 'PROJECT') {
      sql += ` AND project_id = $1`
    }

    sql += ` ORDER BY created_at DESC`
    const rows = await query(sql, params)
    return rows.map((r) => mapInvitation(r))
  } catch (err) {
    return []
  }
}

export async function acceptInvitation(
  userId: string,
  tokenOrId: string
): Promise<InvitationDto> {
  const isId = tokenOrId.length === 36 && tokenOrId.includes('-')
  const inv = await queryOne(
    `SELECT * FROM invitations WHERE ${isId ? 'id = $1' : 'token = $1 OR token_hash = $1'}`,
    [tokenOrId]
  )

  if (!inv) throw new Error('Invitation not found or expired')

  const now = new Date()
  await query(`UPDATE invitations SET status = 'ACCEPTED', updated_at = $1 WHERE id = $2`, [now, inv.id])

  if (inv.workspace_id) {
    try {
      const existingWm = await queryOne(
        `SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
        [inv.workspace_id, userId]
      )
      if (existingWm) {
        await query(
          `UPDATE workspace_members SET role = $1, updated_at = $2 WHERE id = $3`,
          [inv.role || 'MEMBER', now, existingWm.id]
        )
      } else {
        await query(
          `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [crypto.randomUUID(), inv.workspace_id, userId, inv.role || 'MEMBER', now]
        )
      }
    } catch (wmErr) {
      console.warn('[invitation.service] workspace_members upsert warning:', wmErr)
    }
  }

  if (inv.organization_id) {
    try {
      const existingOm = await queryOne(
        `SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
        [inv.organization_id, userId]
      )
      if (existingOm) {
        await query(
          `UPDATE organization_members SET role = $1, updated_at = $2 WHERE id = $3`,
          [inv.role || 'MEMBER', now, existingOm.id]
        )
      } else {
        await query(
          `INSERT INTO organization_members (id, organization_id, user_id, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [crypto.randomUUID(), inv.organization_id, userId, inv.role || 'MEMBER', now]
        )
      }
    } catch (omErr) {
      console.warn('[invitation.service] organization_members upsert warning:', omErr)
    }
  }

  return mapInvitation({ ...inv, status: 'ACCEPTED' })
}

export async function declineInvitation(tokenOrId: string): Promise<void> {
  const isId = tokenOrId.length === 36 && tokenOrId.includes('-')
  await query(
    `UPDATE invitations SET status = 'DECLINED', updated_at = $1 WHERE ${isId ? 'id = $2' : 'token = $2'}`,
    [new Date(), tokenOrId]
  )
}
