import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getInvitationByToken } from '@/server/services/invitation.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { identifier: string } }
) {
  try {
    const inv = await getInvitationByToken(params.identifier)
    if (!inv) return apiError('Invitation not found', 404, 'NOT_FOUND')
    return apiSuccess(inv)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch invitation', 500)
  }
}
