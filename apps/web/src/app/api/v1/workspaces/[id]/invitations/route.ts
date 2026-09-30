import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getInvitationsForResource, createInvitation } from '@/server/services/invitation.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invitations = await getInvitationsForResource('WORKSPACE', params.id)
    return apiSuccess(invitations)
  } catch (err: any) {
    return apiError(err.message || 'Failed to list workspace invitations', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    const body = await req.json()
    const inv = await createInvitation(user?.id || 'system', {
      ...body,
      workspaceId: params.id,
      scope: 'WORKSPACE',
    })
    return apiSuccess(inv, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to create workspace invitation', 500)
  }
}
