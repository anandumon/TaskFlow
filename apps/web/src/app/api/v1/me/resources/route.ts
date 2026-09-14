import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { listOrganizations } from '@/server/services/organization.service'
import { getWorkspacesByOrg } from '@/server/services/workspace.service'
import { getProjectsByWorkspace } from '@/server/services/project.service'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const orgs = await listOrganizations(user?.id)

    const orgResources = []
    for (const org of orgs) {
      const workspaces = await getWorkspacesByOrg(org.id)
      const wsResources = []
      for (const ws of workspaces) {
        const projects = await getProjectsByWorkspace(ws.id)
        wsResources.push({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          color: ws.color,
          icon: ws.icon,
          role: 'OWNER',
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            color: p.color,
            icon: p.icon,
            status: p.status,
            role: 'OWNER',
          })),
        })
      }

      orgResources.push({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        role: 'OWNER',
        isOwner: true,
        workspaces: wsResources,
      })
    }

    return apiSuccess({
      personalSpace: {
        id: 'personal',
        name: 'Personal Space',
        description: 'Your private workspace',
      },
      organizations: orgResources,
    })
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch resource tree', 500)
  }
}
