import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { getWorkspaceDocs, upsertWorkspaceDoc } from '@/server/services/doc.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const docs = await getWorkspaceDocs(params.id)
    return apiSuccess(docs)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch documents', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    const body = await req.json()

    if (!body.title || !body.title.trim()) {
      return apiError('Document title is required', 400)
    }

    const doc = await upsertWorkspaceDoc(params.id, {
      ...body,
      authorName: body.authorName || authUser?.name || 'User',
      authorEmail: authUser?.email,
    })

    return apiSuccess(doc, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to save document', 500)
  }
}
