import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { queryOne } from '@/server/db/postgres'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }

    const row = await queryOne(
      `SELECT status, accepted_at, declined_at, updated_at
       FROM user_terms_acceptance
       WHERE user_id = $1
       LIMIT 1`,
      [authUser.id]
    )

    if (!row) {
      return apiSuccess({
        status: 'PENDING',
        acceptedAt: null,
        declinedAt: null,
        updatedAt: null,
      })
    }

    return apiSuccess({
      status: row.status,
      acceptedAt: row.accepted_at,
      declinedAt: row.declined_at,
      updatedAt: row.updated_at,
    })
  } catch (err: any) {
    console.error('[API GET /me/terms] Error:', err)
    return apiError(err.message || 'Failed to retrieve terms acceptance status', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return apiError('Authentication required', 401, 'UNAUTHORIZED')
    }

    const body = await req.json()
    const { status } = body

    if (status !== 'ACCEPTED' && status !== 'DECLINED') {
      return apiError("status must be either 'ACCEPTED' or 'DECLINED'", 400, 'INVALID_STATUS')
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
    const userAgent = req.headers.get('user-agent') || ''

    let saved
    if (status === 'ACCEPTED') {
      saved = await queryOne(
        `INSERT INTO user_terms_acceptance (user_id, status, accepted_at, declined_at, ip_address, user_agent, updated_at)
         VALUES ($1, 'ACCEPTED', NOW(), NULL, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           status = 'ACCEPTED',
           accepted_at = NOW(),
           declined_at = NULL,
           ip_address = $2,
           user_agent = $3,
           updated_at = NOW()
         RETURNING status, accepted_at, declined_at, updated_at`,
        [authUser.id, ip, userAgent]
      )
    } else {
      saved = await queryOne(
        `INSERT INTO user_terms_acceptance (user_id, status, accepted_at, declined_at, ip_address, user_agent, updated_at)
         VALUES ($1, 'DECLINED', NULL, NOW(), $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           status = 'DECLINED',
           accepted_at = NULL,
           declined_at = NOW(),
           ip_address = $2,
           user_agent = $3,
           updated_at = NOW()
         RETURNING status, accepted_at, declined_at, updated_at`,
        [authUser.id, ip, userAgent]
      )
    }

    return apiSuccess({
      status: saved.status,
      acceptedAt: saved.accepted_at,
      declinedAt: saved.declined_at,
      updatedAt: saved.updated_at,
    })
  } catch (err: any) {
    console.error('[API POST /me/terms] Error:', err)
    return apiError(err.message || 'Failed to update terms acceptance status', 500)
  }
}
