import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser, isUserAdmin } from '@/server/utils/auth'
import { removeOrgMember } from '@/server/services/organization.service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return apiError('Unauthorized', 401)

    const isAdmin = await isUserAdmin(authUser.id, { orgId: params.id })
    if (!isAdmin) {
      return apiError('Forbidden: Only organization administrators have permission to remove members', 403)
    }

    await removeOrgMember(params.id, params.memberId, authUser.id)
    return apiSuccess(null)
  } catch (err: any) {
    return apiError(err.message || 'Failed to remove member', 500)
  }
}

