import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'

export interface ProjectDto {
  id: string
  workspaceId: string
  name: string
  slug: string
  description?: string
  status: string
  progress: number
  color: string
  icon: string
  environments?: string
  totalTasks?: number
  completedTasks?: number
  createdAt: string
  updatedAt: string
}

function mapProject(row: any, counts?: { total: number; completed: number }): ProjectDto {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id || row.workspaceId),
    name: row.name,
    slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: row.description || '',
    status: row.status || 'ACTIVE',
    progress: Number(row.progress || 0),
    color: row.color || '#3b82f6',
    icon: row.icon || 'Folder',
    environments: row.environments || 'DEV,SIT,UAT,RELEASE,MAIN',
    totalTasks: counts?.total ?? Number(row.total_tasks || 0),
    completedTasks: counts?.completed ?? Number(row.completed_tasks || 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }
}

export async function getProjectsByWorkspace(workspaceId: string): Promise<ProjectDto[]> {
  try {
    const projects = await query(
      `SELECT * FROM projects WHERE workspace_id = $1 AND (deleted = false OR deleted IS NULL) ORDER BY created_at ASC`,
      [workspaceId]
    )

    const tasks = await query(
      `SELECT id, project_id, status FROM tasks WHERE workspace_id = $1 AND (deleted = false OR deleted IS NULL)`,
      [workspaceId]
    )

    const taskStats = new Map<string, { total: number; completed: number }>()
    for (const t of tasks) {
      if (!t.project_id) continue
      const pid = String(t.project_id)
      const curr = taskStats.get(pid) || { total: 0, completed: 0 }
      curr.total += 1
      if (t.status === 'done' || t.status === 'COMPLETED') {
        curr.completed += 1
      }
      taskStats.set(pid, curr)
    }

    return projects.map((p) => mapProject(p, taskStats.get(String(p.id))))
  } catch (err) {
    console.error('[project.service] getProjectsByWorkspace error:', err)
    return []
  }
}

export async function createProject(
  workspaceId: string,
  input: {
    name: string
    description?: string
    status?: string
    progress?: number
    color?: string
    icon?: string
    environments?: string
  }
): Promise<ProjectDto> {
  const id = crypto.randomUUID()
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)
  const now = new Date()

  const row = await queryOne(
    `INSERT INTO projects (id, workspace_id, name, slug, description, status, progress, color, icon, environments, deleted, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, 0, $11, $11)
     RETURNING *`,
    [
      id,
      workspaceId,
      input.name,
      slug,
      input.description || '',
      input.status || 'ACTIVE',
      input.progress || 0,
      input.color || '#3b82f6',
      input.icon || 'Folder',
      input.environments || 'DEV,SIT,UAT,RELEASE,MAIN',
      now,
    ]
  )

  return mapProject(row)
}

export async function updateProject(id: string, updates: Partial<ProjectDto>): Promise<ProjectDto> {
  const existing = await queryOne(`SELECT * FROM projects WHERE id = $1`, [id])
  if (!existing) throw new Error('Project not found')

  const name = updates.name !== undefined ? updates.name : existing.name
  const description = updates.description !== undefined ? updates.description : existing.description
  const status = updates.status !== undefined ? updates.status : existing.status
  const progress = updates.progress !== undefined ? updates.progress : existing.progress
  const color = updates.color !== undefined ? updates.color : existing.color
  const icon = updates.icon !== undefined ? updates.icon : existing.icon
  const environments = updates.environments !== undefined ? updates.environments : existing.environments

  const row = await queryOne(
    `UPDATE projects SET name = $1, description = $2, status = $3, progress = $4, color = $5, icon = $6, environments = $7, updated_at = $8
     WHERE id = $9 RETURNING *`,
    [name, description, status, progress, color, icon, environments, new Date(), id]
  )

  return mapProject(row)
}

export async function deleteProject(id: string): Promise<void> {
  await query(`UPDATE projects SET deleted = true, updated_at = $1 WHERE id = $2`, [new Date(), id])
}
