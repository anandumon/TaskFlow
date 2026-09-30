import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getWorkspaceChannels, createChannel } from '@/server/services/chat.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const channels = await getWorkspaceChannels(params.id)
    return apiSuccess(channels)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch channels', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    const body = await req.json()

    if (!body.name || !body.name.trim()) {
      return apiError('Channel name is required', 400)
    }

    const channel = await createChannel(params.id, {
      name: body.name.trim(),
      description: body.description,
      projectId: body.projectId,
      projectName: body.projectName,
      isPrivate: Boolean(body.isPrivate),
      memberIds: body.memberIds || [],
      createdBy: authUser?.id,
    })

    return apiSuccess(channel, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to create channel', 500)
  }
}
