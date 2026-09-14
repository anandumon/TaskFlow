import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json()
    if (!email || !password) {
      return apiError('Email and password are required', 400)
    }

    const { data, error } = await supabaseAdmin.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          first_name: firstName || '',
          last_name: lastName || '',
        },
      },
    })

    if (error) {
      return apiError(error.message, 400)
    }

    return apiSuccess({
      message: 'Account registered successfully',
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    }, 201)
  } catch (err: any) {
    return apiError(err.message || 'Registration failed', 500)
  }
}
