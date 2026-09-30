import { NextRequest } from 'next/server'
import { apiSuccess } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import {
  recordHeartbeat,
  getActivePresence,
  setOffline,
} from '@/server/services/presence.service'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId') || undefined
  const data = getActivePresence(workspaceId)
  return apiSuccess(data)
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req).catch(() => null)
    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    const userId = authUser?.id || body.userId
    const email = authUser?.email || body.email
    const name = authUser?.fullName || body.name

    if (userId) {
      if (body.status === 'offline') {
        setOffline(userId)
      } else {
        recordHeartbeat(userId, {
          name,
          email,
          workspaceId: body.workspaceId,
          status: body.status || 'online',
        })
      }
    }

    const currentPresence = getActivePresence(body.workspaceId)
    return apiSuccess(currentPresence)
  } catch (err: any) {
    return apiSuccess(getActivePresence())
  }
}
