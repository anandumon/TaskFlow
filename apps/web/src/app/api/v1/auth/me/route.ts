import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { supabaseAdmin } from '@/server/db/supabase-admin'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Attempt to query detailed profile from users table if available
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    return apiSuccess({
      id: authUser.id,
      email: authUser.email,
      firstName: userRow?.first_name || authUser.fullName?.split(' ')[0] || '',
      lastName: userRow?.last_name || authUser.fullName?.split(' ').slice(1).join(' ') || '',
      displayName: authUser.fullName || authUser.email,
      emailVerified: true,
      avatarUrl: userRow?.avatar_url,
    })
  } catch (err: any) {
    return apiError(err.message || 'Failed to get user profile', 500)
  }
}
