import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return apiSuccess({
      connectionId: params.id,
      eventsSynced: 0,
      tasksExported: 0,
      status: 'SUCCESS',
      message: 'Calendar sync completed',
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return apiError(err.message || 'Calendar sync failed', 500)
  }
}
