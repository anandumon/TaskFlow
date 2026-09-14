import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getWorkspacesByOrg, createWorkspace } from '@/server/services/workspace.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaces = await getWorkspacesByOrg(params.id)
    return apiSuccess(workspaces)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch workspaces', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const workspace = await createWorkspace(params.id, body)
    return apiSuccess(workspace, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to create workspace', 500)
  }
}
