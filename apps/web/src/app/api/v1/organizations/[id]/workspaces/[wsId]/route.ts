import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { updateWorkspace } from '@/server/services/workspace.service'

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
