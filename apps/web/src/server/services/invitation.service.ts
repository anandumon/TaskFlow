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
  projectIds?: string[]
  inviterName?: string
  scope: string
  role: string
  token: string
  referralCode?: string
  status: string
  expiresAt: string
  createdAt: string
}

let hasEnsuredInvitationsSchema = false
export async function ensureInvitationsSchema() {
  if (hasEnsuredInvitationsSchema) return
  try {
    await query(`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS referral_code VARCHAR(64);`)
    await query(`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS project_ids JSONB DEFAULT '[]'::jsonb;`)
    await query(`CREATE INDEX IF NOT EXISTS idx_invitations_referral_code ON invitations(referral_code);`)
    await query(`UPDATE invitations SET referral_code = 'TF-' || UPPER(SUBSTRING(token FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(token FROM 5 FOR 4)) WHERE referral_code IS NULL AND token IS NOT NULL;`)
  } catch (e) {
    console.warn('[invitation.service] ensureInvitationsSchema warning:', e)
  }
  hasEnsuredInvitationsSchema = true
}

function mapInvitation(row: any, inviterName?: string): InvitationDto {
  let projectIds: string[] | undefined = undefined
  if (row.project_ids) {
    try {
      projectIds = typeof row.project_ids === 'string' ? JSON.parse(row.project_ids) : row.project_ids
    } catch {}
  }
  if (!projectIds && row.project_id) {
    projectIds = [String(row.project_id)]
  }

  return {
    id: String(row.id),
    email: row.email,
    organizationId: row.organization_id ? String(row.organization_id) : undefined,
    organizationName: row.organization_name || 'Organization',
    orgName: row.organization_name || 'Organization',
    workspaceId: row.workspace_id ? String(row.workspace_id) : undefined,
    workspaceName: row.workspace_name || 'Workspace',
    projectId: row.project_id ? String(row.project_id) : (projectIds?.[0]),
    projectName: row.project_name || 'Project',
    projectIds,
    inviterName: inviterName || row.inviter_name || 'A team member',
    scope: row.scope || 'ORGANIZATION',
    role: row.role || 'MEMBER',
    token: row.token,
    referralCode: row.referral_code || undefined,
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
    projectIds?: string[]
  }
): Promise<InvitationDto> {
  await ensureInvitationsSchema()
  const id = crypto.randomUUID()
  const token = crypto.randomBytes(24).toString('hex')
  const now = new Date()
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)

  // Generate unique high-entropy referral code (e.g. TF-8K3N-7P2X)
  const codeRaw = crypto.randomBytes(4).toString('hex').toUpperCase()
  const referralCode = `TF-${codeRaw.slice(0, 4)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`

  const projectIds = input.projectIds && input.projectIds.length > 0 
    ? input.projectIds 
    : (input.projectId ? [input.projectId] : [])
  const primaryProjectId = projectIds[0] || input.projectId || null

  let prjName = 'Project'
  if (projectIds.length > 0) {
    const pRows = await query(`SELECT id, name, workspace_id FROM projects WHERE id = ANY($1)`, [projectIds])
    if (pRows.length > 0) {
      prjName = pRows.map((p) => p.name).join(', ')
      if (!input.workspaceId && pRows[0].workspace_id) {
        input.workspaceId = pRows[0].workspace_id
      }
    }
  } else if (input.projectId) {
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
  const roleName = (input.role || 'Admin').toLowerCase()
  let roleId: string = 'a0000000-0000-0000-0000-000000000002' // Admin full permission default
  if (roleName.includes('owner')) roleId = 'a0000000-0000-0000-0000-000000000001'
  else if (roleName.includes('admin')) roleId = 'a0000000-0000-0000-0000-000000000002'
  else if (roleName.includes('manager')) roleId = 'a0000000-0000-0000-0000-000000000002'
  else if (roleName.includes('guest')) roleId = 'a0000000-0000-0000-0000-000000000005'
  else roleId = 'a0000000-0000-0000-0000-000000000002'

  const row = await queryOne(
    `INSERT INTO invitations (
      id, email, role, role_id, scope, organization_id, organization_name,
      workspace_id, workspace_name, project_id, project_name, project_ids,
      token, token_hash, referral_code, status, invited_by, expires_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PENDING', $16, $17, $18, $18)
    RETURNING *`,
    [
      id,
      input.email.toLowerCase().trim(),
      input.role || 'ADMIN',
      roleId,
      input.scope || 'PROJECT',
      input.organizationId || null,
      orgName,
      input.workspaceId || null,
      wsName,
      primaryProjectId,
      prjName,
      JSON.stringify(projectIds),
      token,
      tokenHash,
      referralCode,
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
      inviteUrl,
      referralCode
    )
  } catch (err: any) {
    console.error('[invitation.service] Failed to send invitation email:', err?.message || err)
  }

  return mapInvitation(row)
}

export async function getPendingInvitationsForUser(email: string): Promise<InvitationDto[]> {
  if (!email) return []
  try {
    await ensureInvitationsSchema()
    const rows = await query(
      `SELECT * FROM invitations WHERE LOWER(email) = LOWER($1) AND status = 'PENDING' ORDER BY created_at DESC`,
      [email.trim()]
    )
    return rows.map((r) => mapInvitation(r))
  } catch (err) {
    console.warn('[invitation.service] getPendingInvitationsForUser error:', err)
    return []
  }
}

export async function getInvitationByToken(tokenOrCode: string): Promise<InvitationDto | null> {
  await ensureInvitationsSchema()
  const cleaned = (tokenOrCode || '').trim()
  const isId = cleaned.length === 36 && cleaned.includes('-')
  const row = await queryOne(
    `SELECT i.*, 
            u.display_name as inviter_display_name, 
            u.first_name as inviter_first_name, 
            u.last_name as inviter_last_name, 
            u.email as inviter_email
     FROM invitations i
     LEFT JOIN users u ON i.invited_by = u.id
     WHERE ${
       isId
         ? 'i.id = $1'
         : `i.token = $1 
            OR i.token_hash = $1 
            OR UPPER(i.referral_code) = UPPER($1) 
            OR UPPER(i.referral_code) = UPPER('TF-' || $1) 
            OR UPPER(REPLACE(i.referral_code, '-', '')) = UPPER(REPLACE($1, '-', ''))`
     }`,
    [cleaned]
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
    await ensureInvitationsSchema()
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
  tokenOrCode: string
): Promise<InvitationDto> {
  await ensureInvitationsSchema()
  const cleaned = (tokenOrCode || '').trim()
  const isId = cleaned.length === 36 && cleaned.includes('-')
  const inv = await queryOne(
    `SELECT * FROM invitations WHERE ${
      isId
        ? 'id = $1'
        : `token = $1 
           OR token_hash = $1 
           OR UPPER(referral_code) = UPPER($1) 
           OR UPPER(referral_code) = UPPER('TF-' || $1) 
           OR UPPER(REPLACE(referral_code, '-', '')) = UPPER(REPLACE($1, '-', ''))`
    }`,
    [cleaned]
  )

  if (!inv) throw new Error('Invitation or referral code not found or invalid.')

  // Resolve target user id and perform email verification to prevent misuse
  const isUuid = (val?: string | null) => val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
  let targetUserId = userId
  let currentUserEmail = ''

  if (userId && userId !== 'anonymous') {
    const u = await queryOne(`SELECT id, email FROM users WHERE id = $1 OR auth_user_id = $1 LIMIT 1`, [userId])
    if (u?.id) {
      targetUserId = u.id
      currentUserEmail = (u.email || '').toLowerCase().trim()
    }
  }

  // Anti-misuse check 1: Target email verification
  if (currentUserEmail && inv.email) {
    const invitedEmail = (inv.email || '').toLowerCase().trim()
    if (invitedEmail && currentUserEmail !== invitedEmail) {
      throw new Error(`This referral code was issued specifically for ${invitedEmail}. Please log in with that account to redeem it.`)
    }
  }

  // If anonymous or user id not found, fallback to invited email user record
  if (!targetUserId || targetUserId === 'anonymous' || !isUuid(targetUserId)) {
    if (inv.email) {
      const u = await queryOne(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [inv.email])
      if (u?.id) {
        targetUserId = u.id
      } else {
        const au = await queryOne(`SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [inv.email])
        if (au?.id) targetUserId = au.id
      }
    }
  }

  // Anti-misuse check 2: Status and expiry check
  if (inv.status === 'ACCEPTED') {
    // If already accepted by THIS user, return it safely without failing
    if (targetUserId && inv.invited_user_id === targetUserId) {
      return mapInvitation(inv)
    }
    throw new Error('This invitation code has already been redeemed.')
  }

  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    throw new Error('This invitation code has expired. Please request a new invitation.')
  }

  const now = new Date()
  await query(
    `UPDATE invitations SET status = 'ACCEPTED', accepted_at = $1, updated_at = $1, invited_user_id = $2 WHERE id = $3`,
    [now, isUuid(targetUserId) ? targetUserId : null, inv.id]
  )

  // Map role to standard role ID
  const roleName = (inv.role || 'Admin').toLowerCase()
  let roleId: string = 'a0000000-0000-0000-0000-000000000002' // Admin full permission default
  if (roleName.includes('owner')) roleId = 'a0000000-0000-0000-0000-000000000001'
  else if (roleName.includes('admin')) roleId = 'a0000000-0000-0000-0000-000000000002'
  else if (roleName.includes('manager')) roleId = 'a0000000-0000-0000-0000-000000000002'
  else if (roleName.includes('guest')) roleId = 'a0000000-0000-0000-0000-000000000005'
  else roleId = 'a0000000-0000-0000-0000-000000000002'

  if (inv.workspace_id && isUuid(targetUserId)) {
    try {
      const existingWm = await queryOne(
        `SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
        [inv.workspace_id, targetUserId]
      )
      if (existingWm) {
        await query(
          `UPDATE workspace_members SET role_id = $1, updated_at = $2, status = 'ACTIVE' WHERE id = $3`,
          [roleId, now, existingWm.id]
        )
      } else {
        await query(
          `INSERT INTO workspace_members (id, workspace_id, user_id, role_id, joined_at, created_at, updated_at, status)
           VALUES ($1, $2, $3, $4, $5, $5, $5, 'ACTIVE')`,
          [crypto.randomUUID(), inv.workspace_id, targetUserId, roleId, now]
        )
      }
    } catch (wmErr) {
      console.warn('[invitation.service] workspace_members upsert warning:', wmErr)
    }
  }

  if (inv.organization_id && isUuid(targetUserId)) {
    try {
      const existingOm = await queryOne(
        `SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
        [inv.organization_id, targetUserId]
      )
      if (existingOm) {
        await query(
          `UPDATE organization_members SET role = $1, role_id = $2, updated_at = $3, status = 'ACTIVE' WHERE id = $4`,
          [inv.role || 'MEMBER', roleId, now, existingOm.id]
        )
      } else {
        await query(
          `INSERT INTO organization_members (id, organization_id, user_id, role, role_id, joined_at, created_at, updated_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $6, 'ACTIVE')`,
          [crypto.randomUUID(), inv.organization_id, targetUserId, inv.role || 'MEMBER', roleId, now]
        )
      }
    } catch (omErr) {
      console.warn('[invitation.service] organization_members upsert warning:', omErr)
    }
  }

  // Upsert project memberships for all target projects
  let targetProjectIds: string[] = []
  if (inv.project_ids) {
    try {
      const parsed = typeof inv.project_ids === 'string' ? JSON.parse(inv.project_ids) : inv.project_ids
      if (Array.isArray(parsed)) targetProjectIds = parsed
    } catch {}
  }
  if (targetProjectIds.length === 0 && inv.project_id) {
    targetProjectIds = [inv.project_id]
  }

  for (const pid of targetProjectIds) {
    if (pid && isUuid(targetUserId)) {
      try {
        const existingPm = await queryOne(
          `SELECT id FROM project_memberships WHERE project_id = $1 AND user_id = $2`,
          [pid, targetUserId]
        )
        if (existingPm) {
          await query(
            `UPDATE project_memberships SET role_id = $1, updated_at = $2, status = 'ACTIVE' WHERE id = $3`,
            [roleId, now, existingPm.id]
          )
        } else {
          await query(
            `INSERT INTO project_memberships (id, project_id, user_id, role_id, joined_at, created_at, updated_at, status)
             VALUES ($1, $2, $3, $4, $5, $5, $5, 'ACTIVE')`,
            [crypto.randomUUID(), pid, targetUserId, roleId, now]
          )
        }
      } catch (pmErr) {
        console.warn('[invitation.service] project_memberships upsert warning:', pmErr)
      }
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
