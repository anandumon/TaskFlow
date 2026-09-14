import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        await supabaseAdmin.auth.admin.signOut(token)
      } catch {}
    }

    return apiSuccess({ message: 'Logged out successfully' })
  } catch (err: any) {
    console.error('[API /auth/logout] Error:', err)
    return apiError(err.message || 'Logout failed', 500)
  }
}
