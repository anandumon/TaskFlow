import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') || '/app'

  if (token_hash && type) {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect to verify-email with error state if confirmation failed or expired
  return NextResponse.redirect(`${origin}/verify-email?error=invalid_or_expired_link`)
}
