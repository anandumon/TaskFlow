import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'

export interface OrganizationDto {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface OrgMemberDto {
  id: string
  organizationId: string
  userId: string
  email: string
  name: string
  avatarUrl?: string
  role: string
  roleId: string
  joinedAt: string
}

const OWNER_ROLE_ID = 'a0000000-0000-0000-0000-000000000001'
const MEMBER_ROLE_ID = 'a0000000-0000-0000-0000-000000000004'

function isUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

async function resolveValidOwnerId(userId?: string): Promise<string> {
  if (userId) {
    if (isUuid(userId)) {
      const row = await queryOne(
        `SELECT id FROM users WHERE id = $1 OR auth_user_id = $1 LIMIT 1`,
        [userId]
      )
      if (row?.id) return row.id
      return userId
    } else if (userId.includes('@')) {
      const row = await queryOne(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [userId.toLowerCase().trim()]
      )
      if (row?.id) return row.id
    }
  }

  return userId || ''
}

function mapOrg(row: any): OrganizationDto {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    logoUrl: row.logo_url,
    plan: row.plan || 'PRO',
    ownerId: String(row.owner_id || ''),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }
}

export async function listOrganizations(userId?: string): Promise<OrganizationDto[]> {
  try {
    if (!userId) return []

    const validOwnerId = await resolveValidOwnerId(userId)
    if (!validOwnerId) return []

    const rows = await query(
      `SELECT DISTINCT o.* 
       FROM organizations o
       LEFT JOIN organization_members om ON om.organization_id = o.id
       WHERE (o.deleted = false OR o.deleted IS NULL)
         AND (om.user_id = $1 OR o.owner_id = $1)
         AND ($1 = 'a0000000-0000-0000-0000-000000000001' OR o.id != 'b0000000-0000-0000-0000-000000000001')
       ORDER BY o.created_at ASC`,
      [validOwnerId]
    )
    return rows.map(mapOrg)
  } catch (err) {
    console.warn('[org.service] listOrganizations error:', err)
    return []
  }
}

export async function createOrganization(
  userId: string,
  input: { name: string; slug?: string; workspaceName?: string; workspaceColor?: string }
): Promise<OrganizationDto> {
  const id = crypto.randomUUID()
  const validOwnerId = await resolveValidOwnerId(userId)
  if (!validOwnerId) {
    throw new Error('User not authenticated')
  }
  const slug = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)
  const now = new Date()

  const row = await queryOne(
    `INSERT INTO organizations (id, name, slug, plan, owner_id, settings, deleted, version, created_at, updated_at)
     VALUES ($1, $2, $3, 'PRO', $4, '{}', false, 0, $5, $5)
     RETURNING *`,
    [id, input.name, slug, validOwnerId, now]
  )

  // Add user as OWNER in organization_members
  await query(
    `INSERT INTO organization_members (id, organization_id, user_id, role_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5)`,
    [crypto.randomUUID(), id, validOwnerId, OWNER_ROLE_ID, now]
  )

  // Create primary workspace for this organization
  const wsName = (input.workspaceName || 'Main Workspace').trim()
  const wsColor = input.workspaceColor || '#3b82f6'
  const defaultWsId = crypto.randomUUID()
  await query(
    `INSERT INTO workspaces (id, organization_id, name, slug, description, color, icon, deleted, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'Primary workspace', $5, 'Folder', false, 0, $6, $6)`,
    [defaultWsId, id, wsName, `main-${id.slice(0, 8)}`, wsColor, now]
  )

  try {
    await query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
       VALUES ($1, $2, $3, 'OWNER', $4, $4)`,
      [crypto.randomUUID(), defaultWsId, validOwnerId, now]
    )
  } catch (wmErr) {
    console.debug('[org.service] non-fatal workspace_members insert:', wmErr)
  }

  return mapOrg(row)
}

export async function listOrgMembers(orgId: string): Promise<OrgMemberDto[]> {
  try {
    const rows = await query(
      `SELECT om.id, om.organization_id, om.user_id, om.role_id, om.created_at, om.joined_at,
              u.email, u.display_name, u.first_name, u.last_name, u.avatar_url,
              r.name as role_name
       FROM organization_members om
       LEFT JOIN users u ON om.user_id = u.id
       LEFT JOIN roles r ON om.role_id = r.id
       WHERE om.organization_id = $1`,
      [orgId]
    )

    return rows.map((m: any) => ({
      id: String(m.id),
      organizationId: String(m.organization_id),
      userId: String(m.user_id),
      email: m.email || '',
      name: m.display_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member',
      avatarUrl: m.avatar_url || undefined,
      role: m.role_name || 'Member',
      roleId: String(m.role_id || MEMBER_ROLE_ID),
      joinedAt: m.joined_at ? new Date(m.joined_at).toISOString() : (m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString()),
    }))
  } catch (err) {
    console.warn('[org.service] listOrgMembers error:', err)
    return []
  }
}

export async function removeOrgMember(orgId: string, memberId: string): Promise<void> {
  await query(`DELETE FROM organization_members WHERE organization_id = $1 AND id = $2`, [orgId, memberId])
}

export async function updateOrganization(
  orgId: string,
  input: { name?: string; logoUrl?: string; plan?: string }
): Promise<OrganizationDto | null> {
  const row = await queryOne(
    `UPDATE organizations
     SET name = COALESCE($1, name),
         logo_url = COALESCE($2, logo_url),
         plan = COALESCE($3, plan),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [input.name ?? null, input.logoUrl ?? null, input.plan ?? null, orgId]
  )
  if (!row) return null
  return mapOrg(row)
}

export async function deleteOrganization(orgId: string, requestingUserId?: string): Promise<boolean> {
  const org = await queryOne(`SELECT id, owner_id FROM organizations WHERE id = $1`, [orgId])
  if (!org) {
    return true
  }

  let validOwnerId = ''
  if (requestingUserId) {
    validOwnerId = await resolveValidOwnerId(requestingUserId)
  }

  const isOwner = !validOwnerId || org.owner_id === validOwnerId || requestingUserId === 'a0000000-0000-0000-0000-000000000001'

  // If user is a member (not owner), completely remove the organization for this user:
  if (!isOwner && validOwnerId) {
    await query(
      `DELETE FROM workspace_members WHERE user_id = $1 AND workspace_id IN (SELECT id FROM workspaces WHERE organization_id = $2)`,
      [validOwnerId, orgId]
    )
    await query(
      `DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
      [orgId, validOwnerId]
    )
    return true
  }

  // Safe cascading cleanup for owner deletion:
  // 1. Delete calendar policies for workspaces in this org

  try {
    await query(
      `DELETE FROM calendar_sync_policy WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id = $1)`,
      [orgId]
    )
  } catch {}

  // 2. Delete tasks in workspaces belonging to this org
  await query(
    `DELETE FROM tasks WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id = $1)`,
    [orgId]
  )
  // 3. Delete projects in workspaces belonging to this org
  await query(
    `DELETE FROM projects WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id = $1)`,
    [orgId]
  )
  // 4. Delete workspace members in workspaces belonging to this org
  await query(
    `DELETE FROM workspace_members WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id = $1)`,
    [orgId]
  )
  // 5. Delete teams in workspaces belonging to this org
  await query(
    `DELETE FROM teams WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id = $1)`,
    [orgId]
  )
  // 6. Delete invitations for workspaces or this org
  try {
    await query(`DELETE FROM invitations WHERE organization_id = $1`, [orgId])
  } catch {}
  try {
    await query(`DELETE FROM organization_invitations WHERE organization_id = $1`, [orgId])
  } catch {}
  // 7. Delete audit logs
  try {
    await query(`DELETE FROM audit_logs WHERE organization_id = $1`, [orgId])
  } catch {}
  // 8. Delete workspaces
  await query(`DELETE FROM workspaces WHERE organization_id = $1`, [orgId])
  // 9. Delete organization members
  await query(`DELETE FROM organization_members WHERE organization_id = $1`, [orgId])
  // 10. Delete roles
  try {
    await query(`DELETE FROM roles WHERE organization_id = $1`, [orgId])
  } catch {}
  // 11. Delete organization
  await query(`DELETE FROM organizations WHERE id = $1`, [orgId])
  return true
}
