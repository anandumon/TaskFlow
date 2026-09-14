import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getPendingInvitationsForUser } from '@/server/services/invitation.service'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !user.email) {
      return apiSuccess([])
    }
    const invitations = await getPendingInvitationsForUser(user.email)
    return apiSuccess(invitations)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch pending invitations', 500)
  }
}
