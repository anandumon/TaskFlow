import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { registerUser } from '@/server/services/auth.service'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json()
    if (!email || !password) {
      return apiError('Email and password are required', 400)
    }

    const result = await registerUser({
      email,
      password,
      firstName,
      lastName,
    })

    return apiSuccess(result, 201)
  } catch (err: any) {
    console.error('[API /auth/register] Error:', err)
    const msg = err?.message || 'Registration failed'
    const status = msg.toLowerCase().includes('already exists') ? 409 : 400
    const code = status === 409 ? 'EMAIL_EXISTS' : 'REGISTRATION_FAILED'
    return apiError(msg, status, code)
  }
}
