'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

function OAuthCallbackContent() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const processOAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (session && active) {
          apiClient.setAccessToken(session.access_token)
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', session.access_token)
          }
          setStatus('success')
          setTimeout(() => {
            router.push('/app/home')
          }, 600)
          return
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
          if (currentSession && active) {
            apiClient.setAccessToken(currentSession.access_token)
            if (typeof window !== 'undefined') {
              localStorage.setItem('accessToken', currentSession.access_token)
            }
            setStatus('success')
            setTimeout(() => {
              router.push('/app/home')
            }, 600)
          }
        })

        return () => subscription.unsubscribe()
      } catch (err: any) {
        if (active) {
          setStatus('error')
          setErrorMessage(err?.message || 'OAuth authentication failed.')
        }
      }
    }

    processOAuth()

    return () => {
      active = false
    }
  }, [router])

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-card shadow-xl text-center space-y-4">
      {status === 'loading' && (
        <>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Completing Google Authentication...</h2>
          <p className="text-xs text-muted-foreground">
            Synchronizing your profile and establishing a secure session with Supabase.
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Authenticated!</h2>
          <p className="text-xs text-muted-foreground">
            Redirecting you to your TaskFlow dashboard...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Authentication Failed</h2>
          <p className="text-xs text-rose-500 font-medium">
            {errorMessage || 'Unable to complete OAuth sign-in.'}
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all"
            >
              Back to Sign In
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading authentication details...
          </div>
        }
      >
        <OAuthCallbackContent />
      </Suspense>
    </div>
  )
}
