import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { dispatchDueAlert } from '@/server/services/task.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    const result = await dispatchDueAlert(
      params.id,
      user?.email,
      user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined
    )
    return apiSuccess(result)
  } catch (err: any) {
    console.error(`[API /tasks/${params.id}/due-alert] Error:`, err)
    return apiError(err.message || 'Failed to dispatch due alert', 500)
  }
}
