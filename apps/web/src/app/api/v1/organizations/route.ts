import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { listOrganizations, createOrganization } from '@/server/services/organization.service'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const adminOnly = req.nextUrl.searchParams.get('adminOnly') === 'true'
    const orgs = await listOrganizations(user?.id, adminOnly)
    return apiSuccess(orgs)
  } catch (err: any) {
    return apiError(err.message || 'Failed to list organizations', 500)
  }
}


export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const body = await req.json()
    const org = await createOrganization(user?.id || 'anonymous', body)
    return apiSuccess(org, 201)
  } catch (err: any) {
    return apiError(err.message || 'Failed to create organization', 500)
  }
}
