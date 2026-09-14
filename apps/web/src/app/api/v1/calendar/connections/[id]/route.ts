import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { disconnectConnection } from '@/server/services/calendar.service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await disconnectConnection(params.id)
    return apiSuccess(null)
  } catch (err: any) {
    return apiError(err.message || 'Failed to disconnect calendar', 500)
  }
}
