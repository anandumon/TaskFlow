import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { removeOrgMember } from '@/server/services/organization.service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    await removeOrgMember(params.id, params.memberId)
    return apiSuccess(null)
  } catch (err: any) {
    return apiError(err.message || 'Failed to remove member', 500)
  }
}
