import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { updateWorkspace, deleteWorkspace } from '@/server/services/workspace.service'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; wsId: string } }
) {
  try {
    const body = await req.json()
    const workspace = await updateWorkspace(params.wsId, body)
    return apiSuccess(workspace)
  } catch (err: any) {
    return apiError(err.message || 'Failed to update workspace', 500)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; wsId: string } }
) {
  return PUT(req, { params })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; wsId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }
    await deleteWorkspace(params.wsId)
    return apiSuccess({ success: true, message: 'Workspace deleted successfully' })
  } catch (err: any) {
    console.error('[API DELETE /organizations/:id/workspaces/:wsId] Error:', err)
    return apiError(err.message || 'Failed to delete workspace', 500)
  }
}
