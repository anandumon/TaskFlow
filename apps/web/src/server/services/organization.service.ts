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
    } else if (userId.includes('@')) {
      const row = await queryOne(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [userId.toLowerCase().trim()]
      )
      if (row?.id) return row.id
    }
  }

  // Fallback to first active user in database
  const fallback = await queryOne(`SELECT id FROM users WHERE (deleted = false OR deleted IS NULL) ORDER BY created_at ASC LIMIT 1`)
  if (fallback?.id) return fallback.id

  return '543cb7a9-44dc-4a3e-844c-020d52cefca7'
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
    const rows = await query(
      `SELECT * FROM organizations WHERE (deleted = false OR deleted IS NULL) ORDER BY created_at ASC`
    )
    const orgs = rows.map(mapOrg)
    if (orgs.length > 0) return orgs

    if (userId) {
      const defaultOrg = await createOrganization(userId, { name: 'Default Organization' })
      return [defaultOrg]
    }
    return []
  } catch (err) {
    console.warn('[org.service] listOrganizations error:', err)
    return []
  }
}

export async function createOrganization(
  userId: string,
  input: { name: string; slug?: string }
): Promise<OrganizationDto> {
  const id = crypto.randomUUID()
  const validOwnerId = await resolveValidOwnerId(userId)
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
    `INSERT INTO organization_members (id, organization_id, user_id, role_id, status, joined_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $5, $5)`,
    [crypto.randomUUID(), id, validOwnerId, OWNER_ROLE_ID, now]
  )

  // Auto-create a default workspace for this organization
  const defaultWsId = crypto.randomUUID()
  await query(
    `INSERT INTO workspaces (id, organization_id, name, slug, description, color, icon, deleted, version, created_at, updated_at)
     VALUES ($1, $2, 'Main Workspace', $3, 'Primary workspace', '#3b82f6', 'Folder', false, 0, $4, $4)`,
    [defaultWsId, id, `main-${id.slice(0, 8)}`, now]
  )

  return mapOrg(row)
}

export async function listOrgMembers(orgId: string): Promise<OrgMemberDto[]> {
  try {
    const rows = await query(
      `SELECT om.id, om.organization_id, om.user_id, om.role_id, om.created_at, om.joined_at,
              u.email, u.display_name, u.first_name, u.last_name,
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
