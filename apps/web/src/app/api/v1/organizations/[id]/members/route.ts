import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { listOrgMembers } from '@/server/services/organization.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const members = await listOrgMembers(params.id)
    return apiSuccess(members)
  } catch (err: any) {
    return apiError(err.message || 'Failed to list members', 500)
  }
}
