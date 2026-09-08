import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxrcfczdfstnymbeicmq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4cmNmY3pkZnN0bnltYmVpY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDQ3NjYsImV4cCI6MjEwMzgyMDc2Nn0.Ec38y04rUfXHECajZ__g1CW0hn_k41jSXxTwBJjO9_c'

export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
