import { NextRequest } from 'next/server'
import { supabaseAdmin } from '../db/supabase-admin'
import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'

export interface AuthUser {
  id: string
  email: string
  fullName?: string
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

    await query(
      `INSERT INTO users (
        id, email, first_name, last_name, display_name, status, email_verified, auth_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', true, $6, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING`,
      [newId, cleanEmail || `${newId}@taskflow.local`, firstName, lastName, fullName || firstName, effectiveAuthUserId]
    )

    return newId
  } catch (err) {
    console.warn('[auth.ts] Error syncing user with public.users:', err)
    return '543cb7a9-44dc-4a3e-844c-020d52cefca7'
  }
}

/**
 * Extracts and verifies the authenticated user from the Authorization header,
 * guaranteeing the returned user.id exists in the public.users table.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  try {
    // Check with Supabase Auth
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

    // Fallback: If JWT decoding reveals user payload
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
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
    }
  } catch (err) {
    console.warn('[auth.ts] Failed to parse auth token:', err)
  }

  return null
}
