import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { updateProject, deleteProject } from '@/server/services/project.service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const project = await updateProject(params.id, body)
    return apiSuccess(project)
  } catch (err: any) {
    return apiError(err.message || 'Failed to update project', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteProject(params.id)
    return apiSuccess(null)
  } catch (err: any) {
    return apiError(err.message || 'Failed to delete project', 500)
  }
}
