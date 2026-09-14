import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getSyncPolicy, updateSyncPolicy } from '@/server/services/calendar.service'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const policy = await getSyncPolicy(user?.id)
    return apiSuccess(policy)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch sync policy', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const body = await req.json()
    const policy = await updateSyncPolicy(user?.id || 'default-user', body)
    return apiSuccess(policy)
  } catch (err: any) {
    return apiError(err.message || 'Failed to update sync policy', 500)
  }
}
