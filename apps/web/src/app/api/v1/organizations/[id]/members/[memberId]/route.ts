import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { removeOrgMember } from '@/server/services/organization.service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    await removeOrgMember(params.id, params.memberId, authUser?.id)
    return apiSuccess(null)
  } catch (err: any) {
    return apiError(err.message || 'Failed to remove member', 500)
  }
}
