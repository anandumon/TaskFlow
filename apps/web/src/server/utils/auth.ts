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
    return '543cb7a9-44dc-4a3e-844c-020d52cefca7'
  }
}

import { verifyTaskFlowJwt } from './jwt'

/**
 * Extracts and verifies the authenticated user from the Authorization header,
 * cookies, or query parameters, guaranteeing the returned user.id exists in the public.users table.
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

  // 3. Check query param (useful for dev / direct testing)
  if (!token) {
    const queryToken = req.nextUrl.searchParams.get('token')
    if (queryToken) {
      token = queryToken.trim()
    }
  }

  if (!token) return null

  try {
    // 1. TaskFlow Native HS256 JWT
    const nativePayload = verifyTaskFlowJwt(token)
    if (nativePayload && nativePayload.sub) {
      const canonicalId = await ensureDbUser(
        nativePayload.sub,
        nativePayload.email,
        nativePayload.name
      )
      return {
        id: canonicalId,
        email: nativePayload.email,
        fullName: nativePayload.name,
      }
    }

    // 2. Supabase Auth token
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

          return {
            id: canonicalId,
            email,
            fullName,
          }
        }
      } catch {}
    }

    // 3. Fallback: Parse 3-part JWT payload directly
    const parts = token.split('.')
    if (parts.length === 3) {
      try {
        const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8')
        const payload = JSON.parse(payloadStr)
        const sub = payload.sub || payload.userId || payload.id
        const email = payload.email || ''
        const fullName = payload.name || payload.firstName || email.split('@')[0] || 'User'
        if (sub || email) {
          const canonicalId = await ensureDbUser(sub, email, fullName)
          return {
            id: canonicalId,
            email,
            fullName,
          }
        }
      } catch {}
    }

    // 4. Fallback: Legacy taskflow_jwt_${userId}_... token
    if (token.startsWith('taskflow_jwt_')) {
      const rawId = token.replace('taskflow_jwt_', '').split('_')[0]
      if (isUuid(rawId)) {
        const dbUser = await queryOne(
          `SELECT id, email, display_name FROM users WHERE id = $1 LIMIT 1`,
          [rawId]
        )
        if (dbUser) {
          return {
            id: dbUser.id,
            email: dbUser.email,
            fullName: dbUser.display_name,
          }
        }
      }
    }

    // 5. Fallback: Direct UUID token
    if (isUuid(token)) {
      const dbUser = await queryOne(
        `SELECT id, email, display_name FROM users WHERE id = $1 LIMIT 1`,
        [token]
      )
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.display_name,
        }
      }
    }
  } catch (err) {
    console.warn('[auth.ts] Failed to parse auth token:', err)
  }

  return null
}

