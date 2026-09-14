import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getWorkspaceTeams, createTeam } from '@/server/services/workspace.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teams = await getWorkspaceTeams(params.id)
    return apiSuccess(teams)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch teams', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const team = await createTeam(params.id, body)
    return apiSuccess(team, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to create team', 500)
  }
}
