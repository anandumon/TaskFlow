'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useChatStore } from '@/stores/chat-store'
import { usePresenceStore } from '@/stores/presence-store'
import { apiClient } from '@/lib/api-client'
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users2,
  BarChart3,
  Settings,
  Zap,
  ChevronDown,
  Plus,
  LogOut,
  Moon,
  Sun,
  Shield,
  Layers,
  Calendar,
  HelpCircle,
  Sparkles,
  Building2,
  Check,
  MessageSquare,
  Hash,
  MoreHorizontal,
  Eye,
  EyeOff,
  FileText,
} from 'lucide-react'
import { useUserTheme } from '@/hooks/useUserTheme'
import { UserGuideModal } from '@/components/user-guide-modal'
import { CreateOrganizationModal } from '@/components/create-organization-modal'
import { CreateWorkspaceModal } from '@/components/create-workspace-modal'
import { CreateChannelModal } from '@/features/chat/components/CreateChannelModal'
import { NewDirectMessageModal } from '@/features/chat/components/NewDirectMessageModal'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, logout } = useAuthStore()
  const { currentOrg, organizations, setCurrentOrg, switchOrganization } = useOrgStore()
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspaceStore()
  const { channels, fetchChannels, createChannel, setActiveChannel, setActiveDMUser } = useChatStore()
  const { isUserOnline } = usePresenceStore()
  const { theme, toggleTheme } = useUserTheme()

  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false)
  const [createWsModalOpen, setCreateWsModalOpen] = useState(false)
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false)
  const [newDMModalOpen, setNewDMModalOpen] = useState(false)

  // Sidebar rail hover and lock state (no toggle button needed, expands on hover or click)
  const [isHovered, setIsHovered] = useState(false)
  const [isLockedExpanded, setIsLockedExpanded] = useState(false)
  const sidebarContainerRef = useRef<HTMLDivElement | null>(null)
  const isExpanded = isHovered || isLockedExpanded || mobileOpen

  const [channelsCollapsed, setChannelsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('taskflow_sidebar_hide_channels') === 'true'
    }
    return false
  })
  const [directMessagesCollapsed, setDirectMessagesCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('taskflow_sidebar_hide_dm') === 'true'
    }
    return false
  })

  const toggleChannels = () => {
    setChannelsCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('taskflow_sidebar_hide_channels', String(next))
      }
      return next
    })
  }

  const toggleDirectMessages = () => {
    setDirectMessagesCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('taskflow_sidebar_hide_dm', String(next))
      }
      return next
    })
  }

  const [sidebarMembers, setSidebarMembers] = useState<any[]>([])

  // Load channels and all members with access to active workspace and organization
  useEffect(() => {
    const orgId = currentOrg?.id || currentWorkspace?.organizationId
    const wsId = currentWorkspace?.id

    if (!orgId && !wsId) return

    if (wsId) {
      fetchChannels(wsId)
    }

    const mapMember = (m: any) => ({
      id: m.userId || m.id,
      userId: m.userId || m.id,
      name: m.name || m.displayName || m.email?.split('@')[0] || 'User',
      email: m.email || '',
      avatarUrl: m.avatarUrl || m.avatar_url,
      role: m.role || m.roleName || m.role_name || 'Member',
      isOnline: false,
    })

    const fetchAllMembers = async () => {
      try {
        const memberMap = new Map<string, any>()

        // 1. Fetch organization members (all users with org access)
        if (orgId) {
          try {
            const orgRes = await apiClient.get<any>(`/api/v1/organizations/${orgId}/members`)
            const orgList = Array.isArray(orgRes.data)
              ? orgRes.data
              : Array.isArray((orgRes as any)?.data?.data)
              ? (orgRes as any).data.data
              : Array.isArray(orgRes)
              ? orgRes
              : []
            orgList.forEach((raw: any) => {
              const mapped = mapMember(raw)
              const key = mapped.userId || mapped.id || mapped.email
              if (key) memberMap.set(key, mapped)
            })
          } catch (e) {
            console.warn('Failed to fetch org members in sidebar:', e)
          }
        }

        // 2. Fetch workspace members
        if (wsId) {
          try {
            const wsRes = await apiClient.get<any>(`/api/v1/workspaces/${wsId}/members`)
            const wsList = Array.isArray(wsRes.data)
              ? wsRes.data
              : Array.isArray((wsRes as any)?.data?.data)
              ? (wsRes as any).data.data
              : Array.isArray(wsRes)
              ? wsRes
              : []
            wsList.forEach((raw: any) => {
              const mapped = mapMember(raw)
              const key = mapped.userId || mapped.id || mapped.email
              if (key && !memberMap.has(key)) {
                memberMap.set(key, mapped)
              }
            })
          } catch (e) {
            console.warn('Failed to fetch ws members in sidebar:', e)
          }
        }

        setSidebarMembers(Array.from(memberMap.values()))
      } catch (err) {
        console.error('Error loading sidebar members:', err)
      }
    }

    fetchAllMembers()
  }, [currentWorkspace?.id, currentWorkspace?.organizationId, currentOrg?.id, fetchChannels, user?.id])

  // 10-second auto-close timers and container refs
  const orgTimerRef = useRef<NodeJS.Timeout | null>(null)
  const wsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const orgContainerRef = useRef<HTMLDivElement | null>(null)
  const wsContainerRef = useRef<HTMLDivElement | null>(null)

  const resetOrgTimer = () => {
    if (orgTimerRef.current) clearTimeout(orgTimerRef.current)
    orgTimerRef.current = setTimeout(() => {
      setOrgDropdownOpen(false)
    }, 10000)
  }

  const resetWsTimer = () => {
    if (wsTimerRef.current) clearTimeout(wsTimerRef.current)
    wsTimerRef.current = setTimeout(() => {
      setWsDropdownOpen(false)
    }, 10000)
  }

  useEffect(() => {
    if (orgDropdownOpen) {
      resetOrgTimer()
    } else if (orgTimerRef.current) {
      clearTimeout(orgTimerRef.current)
    }
    return () => {
      if (orgTimerRef.current) clearTimeout(orgTimerRef.current)
    }
  }, [orgDropdownOpen])

  useEffect(() => {
    if (wsDropdownOpen) {
      resetWsTimer()
    } else if (wsTimerRef.current) {
      clearTimeout(wsTimerRef.current)
    }
    return () => {
      if (wsTimerRef.current) clearTimeout(wsTimerRef.current)
    }
  }, [wsDropdownOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgDropdownOpen && orgContainerRef.current && !orgContainerRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false)
      }
      if (wsDropdownOpen && wsContainerRef.current && !wsContainerRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false)
      }
      if (
        isLockedExpanded &&
        sidebarContainerRef.current &&
        !sidebarContainerRef.current.contains(e.target as Node)
      ) {
        setIsLockedExpanded(false)
        setIsHovered(false)
        setOrgDropdownOpen(false)
        setWsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [orgDropdownOpen, wsDropdownOpen, isLockedExpanded])

  const navItems = [
    { label: 'Overview', href: '/app/home', icon: LayoutDashboard },
    { label: 'My Tasks & Board', href: '/app/tasks', icon: CheckSquare },
    { label: 'Projects', href: '/app/projects', icon: FolderKanban },
    { label: 'Docs', href: '/app/docs', icon: FileText },
    { label: 'Sprint Calendar', href: '/app/calendar', icon: Calendar },
    { label: 'Messages & Chat', href: '/app/messages', icon: MessageSquare },
    { label: 'Members', href: '/app/teams', icon: Users2 },
    { label: 'Analytics', href: '/app/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/app/settings', icon: Settings },
  ]

  const renderContent = () => (
    <aside
      ref={sidebarContainerRef}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest('button, a, input, select, textarea, [role="button"], [data-no-expand="true"]')) {
          return
        }
        if (!isLockedExpanded) {
          setIsLockedExpanded(true)
        }
      }}
      className={`h-full max-h-screen bg-sidebar border-r border-border flex flex-col shrink-0 select-none overflow-hidden transition-[width,box-shadow] duration-300 ease-in-out ${
        isExpanded
          ? 'w-64 shadow-2xl shadow-black/70 z-50'
          : 'w-[68px] z-30'
      } ${!mobileOpen ? 'absolute top-0 left-0' : 'relative'}`}
    >
      {/* 1. Fixed Header: Brand & Organization Selector */}
      {isExpanded ? (
        <div className="p-4 border-b border-border/50 shrink-0 bg-sidebar animate-fade-in">
          <div
            onClick={(e) => {
              e.stopPropagation()
              setIsLockedExpanded(!isLockedExpanded)
            }}
            className="flex items-center justify-between mb-3 cursor-pointer group"
            title={isLockedExpanded ? "Click to unlock sidebar" : "Click to lock sidebar open"}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground whitespace-nowrap">TaskFlow</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
              {currentOrg?.plan || 'ENTERPRISE'}
            </span>
          </div>

          {/* Org Switcher Card */}
          <div ref={orgContainerRef} onMouseMove={resetOrgTimer} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOrgDropdownOpen(!orgDropdownOpen)
                setWsDropdownOpen(false)
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-card/60 hover:bg-card/95 border border-border/70 hover:border-primary/40 backdrop-blur-md shadow-sm text-xs font-semibold text-foreground transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {currentOrg?.logoUrl ? (
                  <img
                    src={currentOrg.logoUrl}
                    alt="Org"
                    className="w-7 h-7 rounded-xl object-cover shrink-0 shadow-sm border border-border/50 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#004A6B] via-[#00638E] to-[#8CB9CC] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm shadow-[#00638E]/30 group-hover:scale-105 transition-transform">
                    {currentOrg?.name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                )}
                <div className="text-left truncate min-w-0">
                  <div className="truncate font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                    {currentOrg?.name || 'My Organization'}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-normal tracking-wide uppercase">
                    {currentOrg?.plan || 'Free'} Plan
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground/70 group-hover:text-foreground shrink-0 transition-transform duration-200 ${orgDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {orgDropdownOpen && (
              <div className="mt-2 bg-card border border-border/80 rounded-2xl shadow-xl p-2 space-y-1.5 transition-all duration-200">
                <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Organizations</span>
                  <span className="text-[10px] lowercase font-normal px-1.5 py-0.5 rounded-full bg-muted">{organizations.length} total</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {organizations.map((org) => {
                    const isSelected = currentOrg?.id === org.id
                    return (
                      <button
                        key={org.id}
                        type="button"
                        disabled={isSwitchingOrg}
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (currentOrg?.id === org.id) {
                            setOrgDropdownOpen(false)
                            return
                          }
                          setIsSwitchingOrg(true)
                          setOrgDropdownOpen(false)
                          try {
                            await switchOrganization(org)
                          } finally {
                            setIsSwitchingOrg(false)
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/15 text-primary font-bold shadow-xs'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt={org.name} className="w-5 h-5 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{org.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {/* Create New Organization Button */}
                <div className="pt-1.5 border-t border-border/60">
                  <button
                    onClick={() => {
                      setOrgDropdownOpen(false)
                      setCreateOrgModalOpen(true)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Organization</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-3 px-2 border-b border-border/50 shrink-0 bg-sidebar flex flex-col items-center gap-2.5">
          {/* Collapsed Brand Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsLockedExpanded(true)
            }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md shadow-primary/20 hover:scale-105 transition-transform cursor-pointer"
            title="TaskFlow"
          >
            <Zap className="w-5 h-5" />
          </button>

          {/* Collapsed Org Icon Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsLockedExpanded(true)
              setOrgDropdownOpen(true)
            }}
            className="w-10 h-10 rounded-xl bg-card/60 hover:bg-card border border-border/70 flex items-center justify-center text-xs font-bold text-foreground hover:border-primary/40 transition-all cursor-pointer shadow-xs"
            title={`Organization: ${currentOrg?.name || 'Organization'}`}
          >
            {currentOrg?.logoUrl ? (
              <img src={currentOrg.logoUrl} alt="Org" className="w-6 h-6 rounded-lg object-cover" />
            ) : (
              <span className="text-primary font-bold text-xs">
                {currentOrg?.name?.charAt(0)?.toUpperCase() || 'O'}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 2. Scrollable Middle Body */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* Workspace Selector */}
        {isExpanded ? (
          <div className="px-4 pt-3 pb-1 animate-fade-in">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-muted-foreground mb-1.5 px-1">
              <span className="flex items-center gap-1.5">
                <span>Workspace</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCreateWsModalOpen(true)
                }}
                className="p-1 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                title="Add New Workspace"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div ref={wsContainerRef} onMouseMove={resetWsTimer} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setWsDropdownOpen(!wsDropdownOpen)
                  setOrgDropdownOpen(false)
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-card/60 hover:bg-card/95 border border-border/70 hover:border-primary/40 backdrop-blur-md shadow-sm text-xs font-semibold text-foreground transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: `${currentWorkspace?.color || '#00638E'}20`,
                      border: `1px solid ${currentWorkspace?.color || '#00638E'}50`,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: currentWorkspace?.color || '#00638E',
                        boxShadow: `0 0 8px ${currentWorkspace?.color || '#00638E'}80`,
                      }}
                    />
                  </div>
                  <div className="text-left truncate min-w-0">
                    <div className="truncate font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                      {currentWorkspace?.name || 'Workspace'}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal tracking-wide">
                      Active Environment
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground/70 group-hover:text-foreground shrink-0 transition-transform duration-200 ${wsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {wsDropdownOpen && (
                <div className="mt-2 bg-card border border-border/80 rounded-2xl shadow-xl p-2 space-y-1.5 transition-all duration-200">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Workspaces</span>
                    <span className="text-[10px] lowercase font-normal px-1.5 py-0.5 rounded-full bg-muted">{workspaces.length} total</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {workspaces.map((ws) => {
                      const isSelected = currentWorkspace?.id === ws.id
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentWorkspace(ws)
                            setWsDropdownOpen(false)
                            import('@/stores/project-store').then(({ useProjectStore }) => {
                              useProjectStore.getState().loadProjects(ws.id).catch(() => {})
                            })
                            import('@/stores/task-store').then(({ useTaskStore }) => {
                              useTaskStore.getState().loadTasks(ws.id).catch(() => {})
                            })
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${isSelected
                              ? 'bg-primary/15 text-primary font-bold shadow-xs'
                              : 'hover:bg-muted text-foreground'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor: ws.color || '#00638E',
                                boxShadow: `0 0 6px ${ws.color || '#00638E'}60`,
                              }}
                            />
                            <span className="truncate">{ws.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Create New Workspace Button */}
                  <div className="pt-1.5 border-t border-border/60">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setWsDropdownOpen(false)
                        setCreateWsModalOpen(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Workspace</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-2 flex flex-col items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsLockedExpanded(true)
                setWsDropdownOpen(true)
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-sidebar-accent transition-all cursor-pointer border border-border/60 shadow-2xs group"
              title={`Workspace: ${currentWorkspace?.name || 'Workspace'}`}
            >
              <div
                className="w-3.5 h-3.5 rounded-full transition-transform group-hover:scale-125"
                style={{
                  backgroundColor: currentWorkspace?.color || '#00638E',
                  boxShadow: `0 0 8px ${currentWorkspace?.color || '#00638E'}80`,
                }}
              />
            </button>
          </div>
        )}

        {/* Navigation links */}
        <nav className={`space-y-1 ${isExpanded ? 'p-3' : 'py-2 px-2 flex flex-col items-center space-y-1.5'}`}>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/app/home' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onCloseMobile) onCloseMobile()
                }}
                title={item.label}
                className={`flex items-center rounded-xl text-xs font-semibold transition-all ${
                  isExpanded
                    ? `gap-3 px-3 py-2 w-full ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                      }`
                    : `w-10 h-10 justify-center ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                      }`
                }`}
              >
                <Icon className={`${isExpanded ? 'w-4 h-4' : 'w-5 h-5'} shrink-0`} />
                {isExpanded && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Channels & Direct Messages Section (Reference Screenshot) */}
        {isExpanded && (
          <div className="px-3 pt-2 pb-3 space-y-4 border-t border-border/50 animate-fade-in">
            {/* CHANNELS SECTION */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setChannelsCollapsed(!channelsCollapsed)}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  <span>Channels</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      channelsCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>

                <div className="flex items-center gap-1">
                  <Link
                    href="/app/messages"
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Channels settings"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setCreateChannelModalOpen(true)}
                    className="p-1 rounded-md hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                    title="Add Channel"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {!channelsCollapsed && (
                <div className="space-y-0.5">
                  {channels.slice(0, 5).map((channel) => {
                    const isActive = pathname === '/app/messages' && searchParams.get('channel') === channel.id
                    return (
                      <Link
                        key={channel.id}
                        href={`/app/messages?channel=${channel.id}`}
                        onClick={() => {
                          setActiveChannel(channel)
                          if (onCloseMobile) onCloseMobile()
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-accent text-foreground font-bold shadow-2xs'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {channel.projectName && (
                            <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[9px] flex items-center justify-center shrink-0">
                              P
                            </span>
                          )}
                          <span className="truncate">
                            {channel.name}
                            {channel.projectName && (
                              <span className="text-muted-foreground font-normal ml-1">
                                - {channel.projectName}
                              </span>
                            )}
                          </span>
                        </div>
                      </Link>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => setCreateChannelModalOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-primary hover:bg-sidebar-accent transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Channel</span>
                  </button>
                </div>
              )}
            </div>

            {/* DIRECT MESSAGES SECTION */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-muted-foreground group">
                <button
                  type="button"
                  onClick={toggleDirectMessages}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  title={directMessagesCollapsed ? "Show direct messages (users)" : "Hide direct messages (users)"}
                >
                  <span>Direct Messages</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      directMessagesCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleDirectMessages}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      directMessagesCollapsed
                        ? 'bg-primary/15 text-primary hover:bg-primary/25 font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                    }`}
                    title={directMessagesCollapsed ? "Show users list" : "Hide users list"}
                  >
                    {directMessagesCollapsed ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewDMModalOpen(true)}
                    className="p-1 rounded-md hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                    title="New message"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {directMessagesCollapsed ? (
                <div
                  onClick={toggleDirectMessages}
                  className="mx-1 px-2.5 py-1.5 rounded-xl bg-card/40 border border-dashed border-border/60 hover:border-primary/50 text-[11px] text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-between group"
                  title="Click to expand direct messages"
                >
                  <div className="flex items-center gap-1.5">
                    <EyeOff className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>Users hidden</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted font-semibold text-muted-foreground">
                    {sidebarMembers.filter((m) => !(user && (m.id === user.id || (m as any).userId === user.id || (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())))).length}
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {sidebarMembers
                    .filter((m) => !(user && (m.id === user.id || (m as any).userId === user.id || (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()))))
                    .map((member) => {
                      const isActive = pathname === '/app/messages' && searchParams.get('dm') === member.id
                      const initial = (member.name?.charAt(0) || 'U').toUpperCase()

                      // Hash-based deterministic avatar color with 30 unique colors
                      const DM_PALETTE = [
                        '#4f46e5', '#0d9488', '#1e293b', '#9333ea', '#e11d48',
                        '#0284c7', '#ea580c', '#059669', '#0891b2', '#d97706',
                        '#6366f1', '#27272a', '#be185d', '#7c3aed', '#db2777',
                        '#2563eb', '#16a34a', '#ca8a04', '#475569', '#dc2626',
                        '#0891b2', '#9d174d', '#4338ca', '#0f766e', '#b45309',
                        '#6d28d9', '#be123c', '#1d4ed8', '#047857', '#854d0e',
                      ]
                      const ident = member.email || member.name || member.id || ''
                      let h = 5381
                      for (let i = 0; i < ident.length; i++) {
                        h = ((h << 5) + h) + ident.charCodeAt(i)
                      }
                      const avatarBg = DM_PALETTE[Math.abs(h) % DM_PALETTE.length]
                      const isOnline = isUserOnline(member.id, member.email) || Boolean(member.isOnline)

                      return (
                        <Link
                          key={member.id}
                          href={`/app/messages?dm=${member.id}`}
                          onClick={() => {
                            setActiveDMUser(member)
                            if (onCloseMobile) onCloseMobile()
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                            isActive
                              ? 'bg-accent text-foreground font-bold shadow-2xs'
                              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="relative shrink-0">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                style={{ backgroundColor: avatarBg }}
                              >
                                {initial}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar transition-all duration-300 ${
                                  isOnline
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                                    : 'border-muted-foreground/60 bg-sidebar'
                                }`}
                              />
                            </div>
                            <span className="truncate">{member.name}</span>
                          </div>
                        </Link>
                      )
                    })}

                  <button
                    type="button"
                    onClick={() => setNewDMModalOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-primary hover:bg-sidebar-accent transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New message</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Fixed Footer: Bottom User Guide & Profile */}
      {isExpanded ? (
        <div className="p-3 border-t border-border/50 space-y-2 shrink-0 bg-sidebar animate-fade-in">
          {/* User Guide Interactive Trigger */}
          <button
            onClick={() => setGuideModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 text-xs font-bold text-primary transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary group-hover:rotate-12 transition-transform" />
              <span>Workspace Guide</span>
            </div>
            <span className="text-[10px] bg-primary/20 px-1.5 py-0.5 rounded font-mono">?</span>
          </button>

          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2 truncate">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-primary/40 shadow-xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleTheme()
              }}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              logout()
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      ) : (
        <div className="py-2.5 px-2 border-t border-border/50 space-y-2 shrink-0 bg-sidebar flex flex-col items-center">
          {/* User Guide Compact */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setGuideModalOpen(true)
            }}
            className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center text-primary transition-all cursor-pointer group"
            title="Workspace Guide"
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </button>

          {/* User Avatar Compact */}
          <div
            className="w-8 h-8 rounded-full border border-primary/40 flex items-center justify-center overflow-hidden shrink-0 shadow-xs cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setIsLockedExpanded(true)
            }}
            title={user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            )}
          </div>

          {/* Theme Toggle Compact */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleTheme()
            }}
            className="w-10 h-10 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sign Out Compact */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              logout()
            }}
            className="w-10 h-10 rounded-xl text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  )

  return (
    <>
      <UserGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
      <CreateOrganizationModal isOpen={createOrgModalOpen} onClose={() => setCreateOrgModalOpen(false)} />
      <CreateWorkspaceModal isOpen={createWsModalOpen} onClose={() => setCreateWsModalOpen(false)} />
      <CreateChannelModal
        isOpen={createChannelModalOpen}
        onClose={() => setCreateChannelModalOpen(false)}
        members={sidebarMembers}
        onCreate={async (data) => {
          if (!currentWorkspace?.id) return
          await createChannel(currentWorkspace.id, data)
          router.push('/app/messages')
        }}
      />
      <NewDirectMessageModal
        isOpen={newDMModalOpen}
        onClose={() => setNewDMModalOpen(false)}
        members={sidebarMembers}
        currentUserId={user?.id}
        onSelectMember={(m) => {
          setActiveDMUser(m)
          router.push(`/app/messages?dm=${m.id}`)
        }}
      />

      {/* Desktop Persistent Sidebar Container */}
      <div
        ref={sidebarContainerRef}
        className={`hidden lg:block relative shrink-0 transition-[width] duration-300 ease-in-out ${
          isExpanded ? 'z-50' : 'z-30'
        } ${
          isLockedExpanded ? 'w-64' : 'w-[68px]'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setOrgDropdownOpen(false)
          setWsDropdownOpen(false)
        }}
      >
        {renderContent()}
      </div>

      {/* Mobile Drawer Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="relative z-10 shadow-2xl">
            {renderContent()}
          </div>
          <div
            className="flex-1 h-full cursor-pointer"
            onClick={onCloseMobile}
            title="Close navigation"
          />
        </div>
      )}
    </>
  )
}
