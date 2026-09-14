import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getWorkspaceMembers } from '@/server/services/workspace.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const members = await getWorkspaceMembers(params.id)
    return apiSuccess(members)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch workspace members', 500)
  }
}
