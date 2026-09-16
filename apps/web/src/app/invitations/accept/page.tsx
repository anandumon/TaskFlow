'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function AcceptRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      router.replace(`/invite?token=${encodeURIComponent(token)}`)
    } else {
      router.replace('/invite')
    }
  }, [router, token])

  return (
    <div className="min-h-screen bg-[#0c0817] flex flex-col items-center justify-center p-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
      <p className="text-xs text-white/70">Connecting to your invitation...</p>
    </div>
  )
}

export default function AcceptRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0817] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <AcceptRedirectContent />
    </Suspense>
  )
}
