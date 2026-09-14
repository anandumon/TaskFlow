import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { dispatchUpcomingDueAlerts } from '@/server/services/task.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email') || user?.email

    const result = await dispatchUpcomingDueAlerts(
      params.id,
      email,
      user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined
    )
    return apiSuccess(result)
  } catch (err: any) {
    console.error(`[API dispatch-upcoming] Error:`, err)
    return apiError(err.message || 'Failed to dispatch upcoming due alerts', 500)
  }
}
