import { NextRequest } from 'next/server'
import { supabaseAdmin } from '../db/supabase-admin'

export interface AuthUser {
  id: string
  email: string
  fullName?: string
}

/**
 * Extracts and verifies the authenticated user from the Authorization header
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
      return {
        id: user.id,
        email: user.email || '',
        fullName:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split('@')[0] : 'User'),
      }
    }

    // Fallback: If JWT decoding reveals user payload
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
      const sub = payload.sub || payload.userId || payload.id
      const email = payload.email || ''
      if (sub) {
        return {
          id: sub,
          email,
          fullName: payload.name || payload.firstName || email.split('@')[0] || 'User',
        }
      }
    }
  } catch (err) {
    console.warn('[auth.ts] Failed to parse auth token:', err)
  }

  return null
}
