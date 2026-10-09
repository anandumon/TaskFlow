import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const workspaceId = params.id

    // 1. Check workspace settings
    const ws = await queryOne(
      `SELECT settings FROM workspaces WHERE id = $1`,
      [workspaceId]
    )

    if (ws?.settings?.statuses && Array.isArray(ws.settings.statuses) && ws.settings.statuses.length > 0) {
      return apiSuccess(ws.settings.statuses)
    }

    // 2. If not stored in settings, detect from existing tasks in workspace
    const taskRows = await query(
      `SELECT DISTINCT status FROM tasks WHERE workspace_id = $1`,
      [workspaceId]
    )

    const existingStatusIds = taskRows.map((r: any) => r.status).filter(Boolean)

    // Build intelligent workspace statuses matching production
    const defaultList: any[] = [
      { id: 'todo', name: 'TO DO', color: '#87909e', category: 'NOT_STARTED', order: 0, isDefault: true },
    ]

    // Check known custom status patterns
    if (existingStatusIds.some((s: string) => s.includes('on_hold') || s === 'on_hold_9074')) {
      const matchId = existingStatusIds.find((s: string) => s.includes('on_hold')) || 'on_hold_9074'
      defaultList.push({ id: matchId, name: 'ON HOLD', color: '#87909e', category: 'ACTIVE', order: defaultList.length })
    }

    defaultList.push({ id: 'in_progress', name: 'IN PROGRESS', color: '#0284c7', category: 'ACTIVE', order: defaultList.length })
    defaultList.push({ id: 'in_review', name: 'IN REVIEW', color: '#a855f7', category: 'ACTIVE', order: defaultList.length })

    if (existingStatusIds.some((s: string) => s === 'in_dev_7722' || s === 'in_dev')) {
      const matchId = existingStatusIds.find((s: string) => s === 'in_dev_7722') || 'in_dev_7722'
      defaultList.push({ id: matchId, name: 'IN DEV', color: '#0ea5e9', category: 'ACTIVE', order: defaultList.length })
    }

    if (existingStatusIds.some((s: string) => s === 'in_uat_3343' || s.includes('uat'))) {
      const matchId = existingStatusIds.find((s: string) => s.includes('uat')) || 'in_uat_3343'
      defaultList.push({ id: matchId, name: 'IN UAT', color: '#06b6d4', category: 'ACTIVE', order: defaultList.length })
    }

    if (existingStatusIds.some((s: string) => s === 'in_sit_2471' || s.includes('sit'))) {
      const matchId = existingStatusIds.find((s: string) => s.includes('sit')) || 'in_sit_2471'
      defaultList.push({ id: matchId, name: 'IN SIT', color: '#3b82f6', category: 'ACTIVE', order: defaultList.length })
    }

    if (existingStatusIds.some((s: string) => s === 'release_5155' || s.includes('release'))) {
      const matchId = existingStatusIds.find((s: string) => s.includes('release')) || 'release_5155'
      defaultList.push({ id: matchId, name: 'RELEASE', color: '#6366f1', category: 'ACTIVE', order: defaultList.length })
    }

    defaultList.push({ id: 'done', name: 'COMPLETED', color: '#10b981', category: 'CLOSED', order: defaultList.length })

    // Auto-persist into workspace settings for persistent consistency
    await query(
      `UPDATE workspaces 
       SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{statuses}', $1::jsonb) 
       WHERE id = $2`,
      [JSON.stringify(defaultList), workspaceId]
    )

    return apiSuccess(defaultList)
  } catch (err: any) {
    console.error('[workspace statuses API] Error:', err)
    return apiError(err.message || 'Failed to fetch statuses', 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser?.id) {
      return apiError('Unauthorized', 401)
    }

    const workspaceId = params.id
    const body = await req.json()
    const { statuses } = body

    if (!Array.isArray(statuses) || statuses.length === 0) {
      return apiError('Valid statuses array is required', 400)
    }

    await query(
      `UPDATE workspaces 
       SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{statuses}', $1::jsonb) 
       WHERE id = $2`,
      [JSON.stringify(statuses), workspaceId]
    )

    return apiSuccess(statuses)
  } catch (err: any) {
    console.error('[workspace statuses API] Error saving:', err)
    return apiError(err.message || 'Failed to save statuses', 500)
  }
}
