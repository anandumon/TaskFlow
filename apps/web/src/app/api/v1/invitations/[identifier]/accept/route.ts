import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { acceptInvitation } from '@/server/services/invitation.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { identifier: string } }
) {
  try {
    const user = await getAuthUser(req)
    const inv = await acceptInvitation(user?.id || 'anonymous', params.identifier)
    return apiSuccess(inv)
  } catch (err: any) {
    return apiError(err.message || 'Failed to accept invitation', 400)
  }
}
