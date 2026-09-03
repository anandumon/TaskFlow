'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { CommandPalette } from '@/components/command-palette'
import { Loader2 } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore()
  const { fetchOrganizations, currentOrg } = useOrgStore()
  const { fetchWorkspaces, currentWorkspace } = useWorkspaceStore()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else {
        fetchOrganizations().then((orgs) => {
          if (orgs.length === 0) {
            router.push('/onboarding')
          } else {
            const org = orgs[0]
            fetchWorkspaces(org.id).then(() => {
              setInitialLoaded(true)
            })
          }
        })
      }
    }
  }, [isLoading, isAuthenticated, router, fetchOrganizations, fetchWorkspaces])

  useEffect(() => {
    if (currentOrg) {
      fetchWorkspaces(currentOrg.id)
    }
  }, [currentOrg, fetchWorkspaces])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (isLoading || !initialLoaded) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-xl shadow-primary/20 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <div className="text-xs text-muted-foreground font-medium tracking-wide">
          Loading TaskFlow workspace...
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenCommand={() => setCommandOpen(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6">
          {children}
        </main>
      </div>
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  )
}
