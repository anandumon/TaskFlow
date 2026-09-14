import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { listConnections } from '@/server/services/calendar.service'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const connections = await listConnections(user?.id)
    return apiSuccess(connections)
  } catch (err: any) {
    return apiError(err.message || 'Failed to list calendar connections', 500)
  }
}
