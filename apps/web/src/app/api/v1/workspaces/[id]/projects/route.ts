import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getProjectsByWorkspace, createProject } from '@/server/services/project.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    const projects = await getProjectsByWorkspace(params.id, user?.id)
    return apiSuccess(projects)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch projects', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const project = await createProject(params.id, body)
    return apiSuccess(project, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to create project', 500)
  }
}
