import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { deleteWorkspaceDoc } from '@/server/services/doc.service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    // Log user if present, proceed with deletion for the workspace
    if (authUser?.id) {
      console.log(`[docs/DELETE] User ${authUser.id} deleting doc ${params.docId} in ws ${params.id}`)
    }

    const decodedDocId = decodeURIComponent(params.docId)
    const success = await deleteWorkspaceDoc(params.id, decodedDocId)
    if (!success) {
      return apiError('Failed to delete document from database', 500)
    }

    return apiSuccess({ deleted: true, id: decodedDocId })
  } catch (err: any) {
    return apiError(err.message || 'Failed to delete document', 500)
  }
}
