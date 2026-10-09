'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CalendarOAuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/app/calendar')
  }, [router])

  return null
}
