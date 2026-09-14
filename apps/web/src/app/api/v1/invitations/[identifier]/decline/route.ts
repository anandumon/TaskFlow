import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { declineInvitation } from '@/server/services/invitation.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { identifier: string } }
) {
  try {
    await declineInvitation(params.identifier)
    return apiSuccess({ message: 'Invitation declined' })
  } catch (err: any) {
    return apiError(err.message || 'Failed to decline invitation', 400)
  }
}
