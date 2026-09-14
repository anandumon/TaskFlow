import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { listExternalCalendars } from '@/server/services/calendar.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const calendars = await listExternalCalendars(params.id)
    return apiSuccess(calendars)
  } catch (err: any) {
    return apiError(err.message || 'Failed to list calendars', 500)
  }
}
