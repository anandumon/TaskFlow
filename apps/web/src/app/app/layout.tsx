'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { CommandPalette } from '@/components/command-palette'
import { OnboardingWizardModal } from '@/features/onboarding/components/OnboardingWizardModal'
import { Loader2 } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore()
  const { fetchOrganizations, currentOrg } = useOrgStore()
  const { fetchWorkspaces, currentWorkspace } = useWorkspaceStore()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Only show onboarding modal for newly registered users (isNewUser === true)
    // If a user exists in DB and logs in, NEVER show the organization/workspace creation modal!
    if (user && user.id && user.isNewUser === true) {
      const completed = localStorage.getItem(`taskflow_onboarding_completed_${user.id}`)
      if (!completed) {
        setShowOnboarding(true)
        return
      }
    }
    setShowOnboarding(false)
  }, [user])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) {
      setAuthChecked(true)
      router.push('/login')
      return
    }

    // Parallel prefetching for maximum speed and zero waterfall delay
    Promise.all([
      loadUser(),
      fetchOrganizations(),
    ])
      .then(([_, orgs]) => {
        setAuthChecked(true)
        const activeOrgs = orgs || []
        if (activeOrgs.length > 0) {
          fetchWorkspaces(activeOrgs[0].id).finally(() => {
            setInitialLoaded(true)
          })
        } else {
          setShowOnboarding(true)
          setInitialLoaded(true)
        }
      })
      .catch((err) => {
        console.warn('Layout parallel load notice:', err)
        setAuthChecked(true)
        setInitialLoaded(true)
      })
  }, [loadUser, fetchOrganizations, fetchWorkspaces, router, user?.isNewUser])

  useEffect(() => {
    if (!authChecked || isLoading) return
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [authChecked, isLoading, isAuthenticated, router])



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

  if (!authChecked || isLoading || !initialLoaded) {
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

      {/* ClickUp-style Onboarding Wizard Modal for New Users */}
      {showOnboarding && (
        <OnboardingWizardModal
          onComplete={() => {
            setShowOnboarding(false)
            if (user?.id) {
              localStorage.setItem(`taskflow_onboarding_completed_${user.id}`, 'true')
            }
            localStorage.setItem('taskflow_onboarding_completed', 'true')
            fetchOrganizations().then((freshOrgs) => {
              if (freshOrgs && freshOrgs.length > 0) {
                fetchWorkspaces(freshOrgs[0].id)
              }
            })
          }}
        />
      )}
    </div>
  )
}
