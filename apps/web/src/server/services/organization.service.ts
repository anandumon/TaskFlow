import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'

export interface OrganizationDto {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: string
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
  joinedAt: string
}

function mapOrg(row: any): OrganizationDto {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    logoUrl: row.logo_url,
    plan: row.plan || 'PRO',
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
  const slug = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)
  const now = new Date()

  const row = await queryOne(
    `INSERT INTO organizations (id, name, slug, plan, deleted, version, created_at, updated_at)
     VALUES ($1, $2, $3, 'PRO', false, 0, $4, $4)
     RETURNING *`,
    [id, input.name, slug, now]
  )

  // Add user as OWNER in organization_members
  await query(
    `INSERT INTO organization_members (id, organization_id, user_id, role, created_at, updated_at)
     VALUES ($1, $2, $3, 'OWNER', $4, $4)`,
    [crypto.randomUUID(), id, userId, now]
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
      `SELECT om.id, om.organization_id, om.user_id, om.role, om.created_at,
              u.email, u.display_name, u.first_name, u.last_name
       FROM organization_members om
       LEFT JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = $1`,
      [orgId]
    )

    return rows.map((m: any) => ({
      id: String(m.id),
      organizationId: String(m.organization_id),
      userId: String(m.user_id),
      email: m.email || '',
      name: m.display_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member',
      role: m.role || 'MEMBER',
      joinedAt: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
    }))
  } catch (err) {
    console.warn('[org.service] listOrgMembers error:', err)
    return []
  }
}

export async function removeOrgMember(orgId: string, memberId: string): Promise<void> {
  await query(`DELETE FROM organization_members WHERE organization_id = $1 AND id = $2`, [orgId, memberId])
}
