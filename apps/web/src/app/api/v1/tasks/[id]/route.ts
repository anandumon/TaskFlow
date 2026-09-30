import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser, isUserAdmin } from '@/server/utils/auth'
import { getTaskById, updateTask, deleteTask } from '@/server/services/task.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await getTaskById(params.id)
    if (!task) return apiError('Task not found', 404, 'NOT_FOUND')
    return apiSuccess(task)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch task', 500)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const task = await updateTask(params.id, body)
    return apiSuccess(task)
  } catch (err: any) {
    return apiError(err.message || 'Failed to update task', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return apiError('Unauthorized', 401)

    const isAdmin = await isUserAdmin(user.id, { taskId: params.id })
    if (!isAdmin) {
      return apiError('Forbidden: Only administrators have permission to delete tasks', 403)
    }

    await deleteTask(params.id)
    return apiSuccess(null)
  } catch (err: any) {
    return apiError(err.message || 'Failed to delete task', 500)
  }
}
