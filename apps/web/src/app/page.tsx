'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export default function RootPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, loadUser } = useAuthStore()

  useEffect(() => {
    loadUser().then(() => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (token) {
        router.push('/app/home')
      } else {
        router.push('/login')
      }
    })
  }, [loadUser, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}
