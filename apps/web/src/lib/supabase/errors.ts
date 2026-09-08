export function mapSupabaseError(error: any): string {
  if (!error) return 'An unexpected error occurred.'

  const message = (error.message || error.msg || error.error_description || '').toLowerCase()
  const code = (error.code || error.error_code || '').toLowerCase()

  if (message.includes('invalid login credentials') || message.includes('invalid grant')) {
    return 'The email or password is incorrect.'
  }

  if (message.includes('email not confirmed') || message.includes('not verified') || code.includes('email_not_confirmed')) {
    return 'Please verify your email before signing in.'
  }

  if (message.includes('rate limit') || message.includes('too many requests') || error.status === 429) {
    return 'Too many attempts. Please try again later.'
  }

  if (message.includes('error sending confirmation email') || message.includes('error sending')) {
    return "We couldn't send the verification email right now. Please try again shortly."
  }

  if (message.includes('token has expired') || message.includes('otp expired') || message.includes('expired')) {
    return 'This verification link or code has expired. Request a new one.'
  }

  if (message.includes('token is invalid') || message.includes('invalid token') || message.includes('invalid otp')) {
    return 'That verification code is incorrect.'
  }

  if (message.includes('already registered') || message.includes('user already exists')) {
    return 'An account with this email address already exists. Please sign in.'
  }

  if (message.includes('already verified')) {
    return 'Your email is already verified.'
  }

  if (message.includes('unsupported provider') || message.includes('not enabled') || message.includes('provider is not enabled')) {
    return 'Google sign-in is not enabled yet in your Supabase project. Please enable the Google provider in your Supabase Dashboard.'
  }

  return error.message || 'Authentication request failed. Please try again.'
}
