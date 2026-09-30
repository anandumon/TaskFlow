import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser, isUserAdmin } from '@/server/utils/auth'
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
    const user = await getAuthUser(req)
    if (!user) return apiError('Unauthorized', 401)

    const isAdmin = await isUserAdmin(user.id, { workspaceId: params.id })
    if (!isAdmin) {
      return apiError('Forbidden: Only administrators have permission to create new projects', 403)
    }

    const body = await req.json()
    const project = await createProject(params.id, body)
    return apiSuccess(project, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to create project', 500)
  }
}
