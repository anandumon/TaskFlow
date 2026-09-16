import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'

export interface WorkspaceDto {
  id: string
  organizationId: string
  name: string
  slug: string
  description?: string
  color: string
  icon: string
  createdAt: string
}

export interface WorkspaceMemberDto {
  id: string
  userId: string
  email?: string
  displayName?: string
  avatarUrl?: string
  role: string
  joinedAt: string
}

export interface TeamDto {
  id: string
  workspaceId: string
  name: string
  description?: string
  color: string
  icon: string
  memberCount: number
  createdAt: string
}

function mapWorkspace(row: any): WorkspaceDto {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id || row.organizationId || ''),
    name: row.name,
    slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: row.description || '',
    color: row.color || '#3b82f6',
    icon: row.icon || 'Folder',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }
}

export async function getWorkspacesByOrg(orgId: string): Promise<WorkspaceDto[]> {
  try {
    const rows = await query(
      `SELECT * FROM workspaces WHERE organization_id = $1 AND (deleted = false OR deleted IS NULL) ORDER BY created_at ASC`,
      [orgId]
    )
    return rows.map(mapWorkspace)
  } catch (err) {
    console.error('[workspace.service] getWorkspacesByOrg error:', err)
    return []
  }
}

export async function createWorkspace(
  orgId: string,
  input: { name: string; description?: string; color?: string; icon?: string }
): Promise<WorkspaceDto> {
  const id = crypto.randomUUID()
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)
  const now = new Date()

  const row = await queryOne(
    `INSERT INTO workspaces (id, organization_id, name, slug, description, color, icon, deleted, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false, 0, $8, $8)
     RETURNING *`,
    [id, orgId, input.name, slug, input.description || '', input.color || '#3b82f6', input.icon || 'Folder', now]
  )

  return mapWorkspace(row)
}

export async function updateWorkspace(
  workspaceId: string,
  input: { name?: string; description?: string; color?: string; icon?: string }
): Promise<WorkspaceDto> {
  const existing = await queryOne(`SELECT * FROM workspaces WHERE id = $1`, [workspaceId])
  if (!existing) throw new Error('Workspace not found')

  const name = input.name !== undefined ? input.name : existing.name
  const description = input.description !== undefined ? input.description : existing.description
  const color = input.color !== undefined ? input.color : existing.color
  const icon = input.icon !== undefined ? input.icon : existing.icon

  const row = await queryOne(
    `UPDATE workspaces SET name = $1, description = $2, color = $3, icon = $4, updated_at = $5
     WHERE id = $6 RETURNING *`,
    [name, description, color, icon, new Date(), workspaceId]
  )

  return mapWorkspace(row)
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
  try {
    const rows = await query(
      `SELECT wm.id, wm.workspace_id, wm.role_id, wm.created_at, wm.joined_at,
              u.id as user_id, u.email, u.display_name, u.avatar_url,
              r.name as role_name
       FROM workspace_members wm
       LEFT JOIN users u ON wm.user_id = u.id
       LEFT JOIN roles r ON wm.role_id = r.id
       WHERE wm.workspace_id = $1`,
      [workspaceId]
    )
    return rows.map((m: any) => ({
      id: String(m.id),
      userId: String(m.user_id || m.id),
      email: m.email || '',
      displayName: m.display_name || m.name || 'Member',
      avatarUrl: m.avatar_url,
      role: m.role_name || 'Member',
      joinedAt: m.joined_at ? new Date(m.joined_at).toISOString() : (m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString()),
    }))
  } catch (err) {
    console.warn('[workspace.service] getWorkspaceMembers error:', err)
    return []
  }
}

export async function getWorkspaceTeams(workspaceId: string): Promise<TeamDto[]> {
  try {
    const rows = await query(`SELECT * FROM teams WHERE workspace_id = $1`, [workspaceId])
    return rows.map((t: any) => ({
      id: String(t.id),
      workspaceId: String(t.workspace_id),
      name: t.name,
      description: t.description || '',
      color: t.color || '#10b981',
      icon: t.icon || 'Users',
      memberCount: Number(t.member_count || 0),
      createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
    }))
  } catch (err) {
    console.warn('[workspace.service] getWorkspaceTeams error:', err)
    return []
  }
}

export async function createTeam(
  workspaceId: string,
  input: { name: string; description?: string; color?: string; icon?: string }
): Promise<TeamDto> {
  const id = crypto.randomUUID()
  const now = new Date()
  const row = await queryOne(
    `INSERT INTO teams (id, workspace_id, name, description, color, icon, member_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $7)
     RETURNING *`,
    [id, workspaceId, input.name, input.description || '', input.color || '#10b981', input.icon || 'Users', now]
  )

  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    name: row.name,
    description: row.description || '',
    color: row.color || '#10b981',
    icon: row.icon || 'Users',
    memberCount: Number(row.member_count || 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }
}

export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  // Cascading cleanup for workspace:
  // 1. Delete tasks belonging to this workspace
  await query(`DELETE FROM tasks WHERE workspace_id = $1`, [workspaceId])
  // 2. Delete projects belonging to this workspace
  await query(`DELETE FROM projects WHERE workspace_id = $1`, [workspaceId])
  // 3. Delete workspace members
  await query(`DELETE FROM workspace_members WHERE workspace_id = $1`, [workspaceId])
  // 4. Delete teams
  await query(`DELETE FROM teams WHERE workspace_id = $1`, [workspaceId])
  // 5. Delete workspace
  await query(`DELETE FROM workspaces WHERE id = $1`, [workspaceId])
  return true
}
