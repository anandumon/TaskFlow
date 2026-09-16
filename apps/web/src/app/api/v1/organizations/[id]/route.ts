import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { updateOrganization, deleteOrganization } from '@/server/services/organization.service'
import { queryOne } from '@/server/db/postgres'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const org = await queryOne(`SELECT * FROM organizations WHERE id = $1`, [params.id])
    if (!org) {
      return apiError('Organization not found', 404)
    }
    return apiSuccess(org)
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch organization', 500)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }

    const body = await req.json()
    const { name, logoUrl, plan } = body

    const updated = await updateOrganization(params.id, { name, logoUrl, plan })
    if (!updated) {
      return apiError('Organization not found or failed to update', 404)
    }

    return apiSuccess(updated)
  } catch (err: any) {
    console.error('[API /organizations/:id] Error:', err)
    return apiError(err.message || 'Failed to update organization', 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return PATCH(req, { params })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }
    await deleteOrganization(params.id, authUser.id)
    return apiSuccess({ success: true, message: 'Organization deleted successfully' })
  } catch (err: any) {
    console.error('[API DELETE /organizations/:id] Error:', err)
    return apiError(err.message || 'Failed to delete organization', 500)
  }
}
