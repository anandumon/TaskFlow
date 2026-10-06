import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser, canUserAccessWorkspace } from '@/server/utils/auth'
import { getTasksByWorkspace, createTask } from '@/server/services/task.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Unauthorized', 401)
    }

    const hasAccess = await canUserAccessWorkspace(user.id, params.id)
    if (!hasAccess) {
      return apiError('Forbidden: Access denied to this workspace', 403)
    }

    const tasks = await getTasksByWorkspace(params.id, user.id)
    return apiSuccess(tasks)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch tasks', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Unauthorized', 401)
    }

    const hasAccess = await canUserAccessWorkspace(user.id, params.id)
    if (!hasAccess) {
      return apiError('Forbidden: Access denied to this workspace', 403)
    }

    const body = await req.json()
    const task = await createTask(params.id, body, user.id)
    return apiSuccess(task, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to create task', 500)
  }
}
