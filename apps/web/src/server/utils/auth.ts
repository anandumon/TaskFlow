import { NextRequest } from 'next/server'
import { supabaseAdmin } from '../db/supabase-admin'
import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'

export interface AuthUser {
  id: string
  email: string
  fullName?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
}


function isUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

async function ensureDbUser(authId: string, email: string, fullName?: string): Promise<string> {
  try {
    const cleanEmail = (email || '').toLowerCase().trim()

    // 1. Check if user exists by UUID
    if (isUuid(authId)) {
      const existing = await queryOne(
        `SELECT id, auth_user_id FROM users WHERE id = $1 OR auth_user_id = $1 LIMIT 1`,
        [authId]
      )
      if (existing) {
        if (existing.auth_user_id !== authId) {
          try {
            await query(`UPDATE users SET auth_user_id = $1, updated_at = NOW() WHERE id = $2`, [authId, existing.id])
          } catch {}
        }
        return existing.id
      }
    }

    // 2. Check if user exists by email
    if (cleanEmail) {
      const existing = await queryOne(
        `SELECT id, auth_user_id FROM users WHERE email = $1 AND (deleted = false OR deleted IS NULL) LIMIT 1`,
        [cleanEmail]
      )
      if (existing) {
        if (isUuid(authId) && existing.auth_user_id !== authId) {
          try {
            await query(`UPDATE users SET auth_user_id = $1, updated_at = NOW() WHERE id = $2`, [authId, existing.id])
          } catch {}
        }
        return existing.id
      }
    }

    // 3. Insert into public.users
    const newId = isUuid(authId) ? authId : crypto.randomUUID()
    const nameParts = (fullName || email.split('@')[0] || 'User').trim().split(' ')
    const firstName = nameParts[0] || 'User'
    const lastName = nameParts.slice(1).join(' ') || ''
    const effectiveAuthUserId = isUuid(authId) ? authId : newId

    const baseUsername = cleanEmail ? cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : `user_${newId.slice(0, 8)}`
    await query(
      `INSERT INTO users (
        id, email, username, first_name, last_name, display_name, status, email_verified, auth_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', true, $7, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING`,
      [newId, cleanEmail || `${newId}@taskflow.local`, baseUsername || 'user', firstName, lastName, fullName || firstName, effectiveAuthUserId]
    )

    return newId
  } catch (err) {
    console.warn('[auth.ts] Error syncing user with public.users:', err)
    return isUuid(authId) ? authId : ''
  }
}

import { verifyTaskFlowJwt } from './jwt'

/**
 * Extracts and verifies the authenticated user from the Authorization header,
 * cookies, or query parameters, guaranteeing cryptographic validity.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  let token = ''

  // 1. Check Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim()
  }

  // 2. Check cookies if no Bearer token
  if (!token) {
    const cookieToken =
      req.cookies.get('accessToken')?.value ||
      req.cookies.get('token')?.value ||
      req.cookies.get('taskflow_token')?.value
    if (cookieToken) {
      token = cookieToken.trim()
    }
  }

  // 3. Check query param
  if (!token) {
    const queryToken = req.nextUrl.searchParams.get('token')
    if (queryToken) {
      token = queryToken.trim()
    }
  }

  if (!token) return null

  try {
    // 1. TaskFlow Native HS256 JWT (cryptographically verified)
    const nativePayload = verifyTaskFlowJwt(token)
    if (nativePayload && nativePayload.sub) {
      const canonicalId = await ensureDbUser(
        nativePayload.sub,
        nativePayload.email,
        nativePayload.name
      )
      if (canonicalId) {
        return {
          id: canonicalId,
          email: nativePayload.email,
          fullName: nativePayload.name,
        }
      }
    }

    // 2. Supabase Auth token (cryptographically verified via Supabase Auth)
    if (token.startsWith('eyJ')) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
        if (user && !error) {
          const email = user.email || ''
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'User')
          const canonicalId = await ensureDbUser(user.id, email, fullName)

          if (canonicalId) {
            return {
              id: canonicalId,
              email,
              fullName,
            }
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[auth.ts] Failed to parse auth token:', err)
  }

  return null
}

/**
 * Validates whether the user is a member of the workspace or its parent organization.
 */
export async function canUserAccessWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  if (!userId || !workspaceId) return false
  try {
    // 1. Check direct workspace membership
    const wsMember = await queryOne(
      `SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 LIMIT 1`,
      [workspaceId, userId]
    )
    if (wsMember) return true

    // 2. Check parent organization ownership or membership
    const orgAccess = await queryOne(
      `SELECT w.id FROM workspaces w
       JOIN organizations o ON o.id = w.organization_id
       LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = $2
       WHERE w.id = $1 AND (o.owner_id = $2 OR om.user_id = $2) LIMIT 1`,
      [workspaceId, userId]
    )
    if (orgAccess) return true

    // 3. Check admin role
    return await isUserAdmin(userId, { workspaceId })
  } catch (err) {
    console.warn('[auth.ts] canUserAccessWorkspace error:', err)
    return false
  }
}

/**
 * Validates whether the user is an owner or member of the organization.
 */
export async function canUserAccessOrganization(userId: string, orgId: string): Promise<boolean> {
  if (!userId || !orgId) return false
  try {
    const org = await queryOne(
      `SELECT o.id FROM organizations o
       LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = $2
       WHERE o.id = $1 AND (o.owner_id = $2 OR om.user_id = $2) AND (o.deleted = false OR o.deleted IS NULL) LIMIT 1`,
      [orgId, userId]
    )
    return !!org
  } catch (err) {
    console.warn('[auth.ts] canUserAccessOrganization error:', err)
    return false
  }
}

/**
 * Checks whether the given user has administrator or owner privileges
 * within the context of an organization, workspace, project, or task.
 */
export async function isUserAdmin(
  userId: string,
  context: { orgId?: string; workspaceId?: string; projectId?: string; taskId?: string }
): Promise<boolean> {
  if (!userId) return false

  try {
    let orgId = context.orgId
    let workspaceId = context.workspaceId

    // 1. Resolve workspaceId from taskId if given
    if (!workspaceId && context.taskId) {
      const task = await queryOne(`SELECT workspace_id, project_id FROM tasks WHERE id = $1`, [context.taskId])
      if (task) {
        workspaceId = task.workspace_id
        if (!context.projectId && task.project_id) {
          context.projectId = task.project_id
        }
      }
    }

    // 2. Resolve workspaceId from projectId if given
    if (!workspaceId && context.projectId) {
      const proj = await queryOne(`SELECT workspace_id FROM projects WHERE id = $1`, [context.projectId])
      if (proj) workspaceId = proj.workspace_id
    }

    // 3. Resolve orgId from workspaceId if given
    if (!orgId && workspaceId) {
      const ws = await queryOne(`SELECT organization_id FROM workspaces WHERE id = $1`, [workspaceId])
      if (ws) orgId = ws.organization_id
    }

    // 4. Check if user is superuser admin@taskflow.dev
    const userRow = await queryOne(`SELECT email FROM users WHERE id = $1`, [userId])
    if (userRow?.email?.toLowerCase() === 'admin@taskflow.dev') {
      return true
    }

    // 5. Check organization owner or admin role
    if (orgId) {
      const org = await queryOne(`SELECT owner_id FROM organizations WHERE id = $1`, [orgId])
      if (org && org.owner_id === userId) return true

      const orgMember = await queryOne(
        `SELECT om.id, r.name as role_name 
         FROM organization_members om 
         LEFT JOIN roles r ON r.id = om.role_id 
         WHERE om.organization_id = $1 AND om.user_id = $2`,
        [orgId, userId]
      )
      if (orgMember) {
        const rName = (orgMember.role_name || '').toUpperCase()
        if (rName === 'OWNER' || rName === 'ADMIN') return true
      }
    }

    // 6. Check workspace level role
    if (workspaceId) {
      const wsMember = await queryOne(
        `SELECT wm.id, r.name as role_name 
         FROM workspace_members wm 
         LEFT JOIN roles r ON r.id = wm.role_id 
         WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
        [workspaceId, userId]
      )
      if (wsMember) {
        const rName = (wsMember.role_name || '').toUpperCase()
        if (rName === 'OWNER' || rName === 'ADMIN') return true
      }
    }

    return false
  } catch (err) {
    console.warn('[auth.ts] isUserAdmin error:', err)
    return false
  }
}


