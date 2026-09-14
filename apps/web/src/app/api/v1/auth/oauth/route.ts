import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { supabaseAdmin } from '@/server/db/supabase-admin'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email, name, avatarUrl, provider } = await req.json()
    if (!email) {
      return apiError('Email is required for OAuth authentication', 400)
    }

    const cleanEmail = email.trim().toLowerCase()
    const nameParts = (name || '').trim().split(' ')
    const firstName = nameParts[0] || 'Google'
    const lastName = nameParts.slice(1).join(' ') || 'User'

    // Look up or register user in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle()

    const userId = existingUser?.id || crypto.randomUUID()
    const now = new Date().toISOString()

    if (!existingUser) {
      await supabaseAdmin.from('users').insert({
        id: userId,
        email: cleanEmail,
        first_name: firstName,
        last_name: lastName,
        display_name: name || cleanEmail,
        avatar_url: avatarUrl,
        provider: (provider || 'GOOGLE').toUpperCase(),
        email_verified: true,
        created_at: now,
        updated_at: now,
      })
    }

    // Ensure user has default organization & workspace
    const { data: members } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)

    if (!members || members.length === 0) {
      const orgId = crypto.randomUUID()
      await supabaseAdmin.from('organizations').insert({
        id: orgId,
        name: `${firstName}'s Workspace`,
        slug: `workspace-${userId.slice(0, 8)}`,
        plan: 'PRO',
        created_at: now,
        updated_at: now,
      })
      await supabaseAdmin.from('organization_members').insert({
        id: crypto.randomUUID(),
        organization_id: orgId,
        user_id: userId,
        role: 'OWNER',
        created_at: now,
        updated_at: now,
      })
      await supabaseAdmin.from('workspaces').insert({
        id: crypto.randomUUID(),
        organization_id: orgId,
        name: 'Main Workspace',
        slug: `main-${userId.slice(0, 8)}`,
        color: '#3b82f6',
        icon: 'Folder',
        created_at: now,
        updated_at: now,
      })
    }

    return apiSuccess({
      accessToken: `taskflow_jwt_${userId}_${Date.now()}`,
      refreshToken: `taskflow_ref_${userId}_${Date.now()}`,
      user: {
        id: userId,
        email: cleanEmail,
        firstName,
        lastName,
        displayName: name || `${firstName} ${lastName}`,
        avatarUrl,
        emailVerified: true,
      },
    })
  } catch (err: any) {
    console.error('[auth/oauth] Error:', err)
    return apiError(err.message || 'OAuth authentication failed', 500)
  }
}
