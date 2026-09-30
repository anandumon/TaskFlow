import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getPendingInvitationsForUser } from '@/server/services/invitation.service'

import { queryOne } from '@/server/db/postgres'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiSuccess([])
    }
    let email = user.email
    if (!email && user.id) {
      const u = await queryOne(`SELECT email FROM users WHERE id = $1`, [user.id])
      if (u?.email) email = u.email
    }
    if (!email && !user.id) {
      return apiSuccess([])
    }
    const invitations = await getPendingInvitationsForUser(email || '', user.id)
    return apiSuccess(invitations)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch pending invitations', 500)
  }
}
