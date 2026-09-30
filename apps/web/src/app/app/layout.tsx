'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { CommandPalette } from '@/components/command-palette'
import { OnboardingWizardModal } from '@/features/onboarding/components/OnboardingWizardModal'
import { AppShellSkeleton } from '@/components/loading'
import { usePresence } from '@/hooks/use-presence'
import { useChatRealtime } from '@/hooks/use-chat-realtime'

import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  usePresence()
  useChatRealtime()
  const router = useRouter()
  const pathname = usePathname()
  const isChatRoute = pathname === '/app/messages' || pathname?.startsWith('/app/messages')
  const isSettingsRoute = pathname === '/app/settings' || pathname?.startsWith('/app/settings')
  const isFitScreenRoute = isChatRoute || isSettingsRoute
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore()
  const { fetchOrganizations, currentOrg, organizations } = useOrgStore()
  const { fetchWorkspaces, currentWorkspace } = useWorkspaceStore()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const hasPrefetchedRef = useRef(false)

  useEffect(() => {
    if (!user || !user.id) return

    // If user has zero organizations, ALWAYS show onboarding create card!
    if (initialLoaded && organizations.length === 0) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`taskflow_onboarding_completed_${user.id}`)
        localStorage.removeItem('taskflow_onboarding_completed')
      }
      setShowOnboarding(true)
      return
    }

    const completed =
      localStorage.getItem(`taskflow_onboarding_completed_${user.id}`) ||
      localStorage.getItem('taskflow_onboarding_completed')
    const hasInviteToken = typeof window !== 'undefined' ? localStorage.getItem('tf_invite_token') : null

    // If user has an active invite token and has not completed onboarding, show referral prompt!
    if (hasInviteToken && !completed) {
      setShowOnboarding(true)
      return
    }

    if (
      user.isNewUser === true ||
      (typeof window !== 'undefined' && localStorage.getItem('taskflow_is_new_user') === 'true')
    ) {
      if (!completed) {
        setShowOnboarding(true)
        return
      }
    }

    if (organizations.length > 0) {
      setShowOnboarding(false)
    }
  }, [user, organizations.length, initialLoaded])

  useEffect(() => {
    if (hasPrefetchedRef.current) return
    hasPrefetchedRef.current = true

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) {
      setAuthChecked(true)
      router.push('/login')
      return
    }

    // Parallel prefetching for maximum speed, caching, and zero waterfall delay
    Promise.all([
      loadUser(),
      fetchOrganizations(),
    ])
      .then(([userData, orgs]) => {
        setAuthChecked(true)
        const activeOrgs = orgs || []
        if (activeOrgs.length > 0) {
          fetchWorkspaces(activeOrgs[0].id)
            .then((wss) => {
              const activeWs = (wss && wss[0]) || null
              if (activeWs?.id) {
                // Immediately preload all user data for blazing-fast tab switching
                Promise.all([
                  useProjectStore.getState().loadProjects(activeWs.id),
                  useTaskStore.getState().loadTasks(activeWs.id),
                  useWorkspaceStore.getState().fetchMembers(activeWs.id),
                  useOrgStore.getState().fetchMembers(activeOrgs[0].id),
                ]).catch(() => {})
              }
            })
            .finally(() => {
              setInitialLoaded(true)
            })
        } else {
          // User has no organizations: clean stale completion flags and show create card
          if (typeof window !== 'undefined') {
            const uid = (userData as any)?.id || ''
            if (uid) localStorage.removeItem(`taskflow_onboarding_completed_${uid}`)
            localStorage.removeItem('taskflow_onboarding_completed')
          }
          setShowOnboarding(true)
          setInitialLoaded(true)
        }
      })
      .catch((err) => {
        console.warn('Layout parallel load notice:', err)
        setAuthChecked(true)
        setInitialLoaded(true)
      })
  }, [loadUser, fetchOrganizations, fetchWorkspaces, router])

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

  // Preload workspace data whenever workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      Promise.all([
        useProjectStore.getState().loadProjects(currentWorkspace.id),
        useTaskStore.getState().loadTasks(currentWorkspace.id),
        useWorkspaceStore.getState().fetchMembers(currentWorkspace.id),
      ]).catch(() => {})
    }
  }, [currentWorkspace?.id])

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

  if (!initialLoaded && (!authChecked || isLoading)) {
    return <AppShellSkeleton />
  }

  // If new user with no organizations or onboarding is needed, render ONLY the onboarding wizard directly!
  // Prevents any flashing of the main dashboard, sidebar, or header.
  if (showOnboarding || organizations.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] h-screen w-screen bg-[#07080b] flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-fade-in">
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
      </div>
    )
  }

  if (pathname?.startsWith('/app/whiteboard')) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#0d0e12]">
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenCommand={() => setCommandOpen(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className={`flex-1 min-w-0 min-h-0 ${isChatRoute ? 'overflow-hidden p-0 flex flex-col h-full' : isSettingsRoute ? 'overflow-hidden p-3 sm:p-5 flex flex-col h-full' : 'overflow-y-auto p-4 sm:p-6'} bg-background/50`}>
          {children}
        </main>
      </div>
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  )
}
