'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Bell, Plus, Sparkles, Command, HelpCircle, Calendar, CheckCircle2, Clock, Menu, Mail, Loader2, X, ArrowRight, ShieldCheck, Building2, FolderKanban } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { UserGuideModal } from '@/components/user-guide-modal'
import { apiClient } from '@/lib/api-client'

interface HeaderProps {
  onOpenCommand?: () => void
  onToggleMobileSidebar?: () => void
}

export function Header({ onOpenCommand, onToggleMobileSidebar }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore()
  const { currentOrg, fetchOrganizations, setCurrentOrg, fetchUserResources } = useOrgStore()
  const { projects, loadProjects } = useProjectStore()
  const { tasks } = useTaskStore()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const [actioningToken, setActioningToken] = useState<string | null>(null)
  const [headerToast, setHeaderToast] = useState<string | null>(null)
  const [clearedNotifications, setClearedNotifications] = useState(false)

  // Ensure organization and workspace are always loaded for both users
  useEffect(() => {
    if (user && !currentOrg) {
      fetchOrganizations().then((orgs) => {
        if (orgs && orgs.length > 0) {
          fetchWorkspaces(orgs[0].id)
        }
      })
    }
  }, [user, currentOrg, fetchOrganizations, fetchWorkspaces])

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadProjects(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, loadProjects])

  // Resolve current active project or section name for the header breadcrumbs
  const activeProjectOrSection = useMemo(() => {
    if (pathname.startsWith('/app/projects/')) {
      const projId = pathname.replace('/app/projects/', '').split('/')[0]
      const found = projects.find((p) => p.id === projId)
      return found?.name || 'Project Details'
    }
    if (pathname === '/app/teams') return 'Teams & Members'
    if (pathname === '/app/tasks') return 'My Tasks & Board'
    if (pathname === '/app/calendar') return 'Sprint Calendar'
    if (pathname === '/app/overview') return 'Workspace Overview'
    if (pathname === '/app/analytics') return 'Analytics'
    if (pathname === '/app/settings') return 'Settings'
    if (projects.length > 0) return projects[0].name
    return null
  }, [pathname, projects])

  // Real-time task due date alerts: Overdue, 0 days left (today), 1, 2, 3 days left
  const taskDueAlerts = useMemo(() => {
    const alerts: {
      id: string
      taskId: string
      title: string
      type: 'overdue' | 'today' | 'day1' | 'day2' | 'day3'
      badgeText: string
      badgeClass: string
      description: string
      daysDiff: number
    }[] = []

    const now = new Date()
    const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    tasks.forEach((t) => {
      if (
        t.status === 'done' ||
        t.status === 'completed' ||
        t.status === 'closed' ||
        t.status?.toLowerCase() === 'complete'
      ) return

      if (!t.dueDate) return

      let taskTime: number | null = null
      if (t.dueDate === 'Today') {
        taskTime = todayDateOnly
      } else {
        const parsed = new Date(t.dueDate)
        if (!isNaN(parsed.getTime())) {
          taskTime = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime()
        }
      }

      if (taskTime === null) return

      const diffDays = Math.round((taskTime - todayDateOnly) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        alerts.push({
          id: `due-${t.id}`,
          taskId: t.id,
          title: t.title,
          type: 'overdue',
          badgeText: `Past Due (${Math.abs(diffDays)}d ago)`,
          badgeClass: 'bg-rose-500/15 text-rose-500 border border-rose-500/30',
          description: `Task past due date by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}. Immediate action recommended.`,
          daysDiff: diffDays,
        })
      } else if (diffDays === 0) {
        alerts.push({
          id: `due-${t.id}`,
          taskId: t.id,
          title: t.title,
          type: 'today',
          badgeText: '0 Days Left (Due Today)',
          badgeClass: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
          description: 'Task is due today! Complete deliverable before end of sprint.',
          daysDiff: 0,
        })
      } else if (diffDays === 1) {
        alerts.push({
          id: `due-${t.id}`,
          taskId: t.id,
          title: t.title,
          type: 'day1',
          badgeText: '1 Day Left (Due Tomorrow)',
          badgeClass: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
          description: 'Due tomorrow! High priority deadline upcoming.',
          daysDiff: 1,
        })
      } else if (diffDays === 2) {
        alerts.push({
          id: `due-${t.id}`,
          taskId: t.id,
          title: t.title,
          type: 'day2',
          badgeText: '2 Days Left',
          badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
          description: 'Due in 2 days. Keep sprint velocity on track.',
          daysDiff: 2,
        })
      } else if (diffDays === 3) {
        alerts.push({
          id: `due-${t.id}`,
          taskId: t.id,
          title: t.title,
          type: 'day3',
          badgeText: '3 Days Left',
          badgeClass: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
          description: 'Due in 3 days. Milestone deliverable upcoming.',
          daysDiff: 3,
        })
      }
    })

    return alerts.sort((a, b) => a.daysDiff - b.daysDiff)
  }, [tasks])

  const fetchPendingInvitations = useCallback(async () => {
    if (!user) return
    try {
      const res = await apiClient.get<any[]>('/api/v1/invitations/pending-for-me')
      if (res.data) {
        setPendingInvitations(res.data)
      }
    } catch {
      // ignore
    }
  }, [user])

  useEffect(() => {
    fetchPendingInvitations()
    const timer = setInterval(fetchPendingInvitations, 15000)
    return () => clearInterval(timer)
  }, [fetchPendingInvitations])

  const handleAcceptInvite = async (inv: any) => {
    const identifier = inv.id || inv.token
    if (!identifier) return
    setActioningToken(identifier)
    try {
      const res = await apiClient.post<any>(`/api/v1/invitations/${identifier}/accept`)
      const acceptData = res.data || inv
      setHeaderToast(`Joined ${acceptData.projectName || inv.projectName || 'project'} in ${acceptData.organizationName || inv.orgName || 'organization'}!`)
      setPendingInvitations(prev => prev.filter(i => i.id !== inv.id && i.token !== inv.token))

      // Refresh organizations & switch active context
      const orgs = await fetchOrganizations()
      const targetOrgId = acceptData.organizationId || inv.organizationId
      const targetOrg = orgs.find(o => o.id === targetOrgId) || orgs[0]
      if (targetOrg) {
        setCurrentOrg(targetOrg)
        const wss = await fetchWorkspaces(targetOrg.id)
        const targetWsId = acceptData.workspaceId || inv.workspaceId
        const targetWs = wss.find(w => w.id === targetWsId) || wss[0]
        if (targetWs) {
          setCurrentWorkspace(targetWs)
          await loadProjects(targetWs.id)
        }
      }

      await fetchUserResources()

      setTimeout(() => {
        setHeaderToast(null)
        if (acceptData.projectId || inv.projectId) {
          router.push(`/app/projects/${acceptData.projectId || inv.projectId}`)
        } else if (pathname === '/app/teams') {
          window.location.reload()
        }
      }, 1000)
    } catch (err: any) {
      setHeaderToast(err?.response?.data?.message || err?.message || 'Failed to accept invitation')
      setTimeout(() => setHeaderToast(null), 3000)
    } finally {
      setActioningToken(null)
    }
  }

  const handleDeclineInvite = async (inv: any) => {
    const identifier = typeof inv === 'string' ? inv : (inv?.id || inv?.token)
    if (!identifier) return
    setActioningToken(identifier)
    try {
      await apiClient.post(`/api/v1/invitations/${identifier}/decline`)
      setPendingInvitations(prev => prev.filter(i => i.id !== identifier && i.token !== identifier))
      setHeaderToast('Invitation declined.')
      setTimeout(() => setHeaderToast(null), 2500)
    } catch {
      setPendingInvitations(prev => prev.filter(i => i.id !== identifier && i.token !== identifier))
    } finally {
      setActioningToken(null)
    }
  }

  return (
    <>
      <UserGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />

      {headerToast && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{headerToast}</span>
        </div>
      )}

      <header className="h-14 border-b border-border/80 bg-card/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-xs">
        {/* Left: Mobile hamburger & Breadcrumbs */}
        <div className="flex items-center gap-3 text-xs">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Toggle navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Organization */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 text-foreground font-semibold shadow-xs hover:border-primary/40 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                {currentOrg?.name || 'My Organization'}
              </span>
            </div>

            <span className="text-muted-foreground/50 font-bold">/</span>

            {/* Workspace */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 text-foreground font-semibold shadow-xs hover:border-primary/40 transition-colors">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: currentWorkspace?.color || '#00638E' }}
              />
              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                {currentWorkspace?.name || 'Primary Workspace'}
              </span>
            </div>

            {/* Project / Section Context */}
            {activeProjectOrSection && (
              <>
                <span className="text-muted-foreground/50 font-bold hidden sm:inline">/</span>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/15 border border-primary/35 text-primary font-bold shadow-xs">
                  <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">
                    {activeProjectOrSection}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Search & Command Palette trigger */}
        <div className="flex-1 max-w-xl mx-4 sm:mx-8">
          <button
            onClick={onOpenCommand}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted/90 border border-border/70 text-xs text-muted-foreground hover:text-foreground transition-all shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-primary group-hover:scale-105 transition-transform" />
              <span>Search tasks, projects, roadmap, team...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-background border border-border/80 text-foreground shadow-xs">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Actions, User Guide & Notifications */}
        <div className="flex items-center gap-2.5">
          {/* User Guide Button */}
          <button
            onClick={() => setGuideModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-accent text-xs font-semibold text-foreground transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Open Platform Guide & Feature Tour"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Guide</span>
          </button>

          {/* Quick New Task Button (Only show outside of /app/tasks) */}
          {pathname !== '/app/tasks' && (
            <Link
              href="/app/tasks"
              prefetch={true}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Task</span>
            </Link>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent border border-border/70 bg-card/60 relative transition-all shadow-xs cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {(pendingInvitations.length + (clearedNotifications ? 0 : taskDueAlerts.length)) > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center shadow-md animate-pulse">
                  {pendingInvitations.length + (clearedNotifications ? 0 : taskDueAlerts.length)}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-muted-foreground/30" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-88 max-w-[90vw] sm:w-96 bg-popover border border-border rounded-2xl shadow-2xl z-50 p-4 animate-scale-in space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Notifications &amp; Alerts</span>
                    {(pendingInvitations.length + (clearedNotifications ? 0 : taskDueAlerts.length)) > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                        {pendingInvitations.length + (clearedNotifications ? 0 : taskDueAlerts.length)} active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setClearedNotifications(true)
                        setPendingInvitations([])
                        setHeaderToast('All notifications cleared')
                        setTimeout(() => setHeaderToast(null), 2500)
                      }}
                      className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer font-semibold transition-colors"
                      title="Clear all alerts"
                    >
                      Clear all
                    </button>
                    <span
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[10px] text-primary hover:underline cursor-pointer font-semibold"
                    >
                      Close
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {/* Pending Team Invitations Section */}
                  {pendingInvitations.length > 0 && (
                    <div className="space-y-2 pb-2 border-b border-border/80">
                      <div className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Pending Team Invitations
                      </div>
                      {pendingInvitations.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-3 rounded-xl bg-primary/10 border border-primary/30 space-y-2 text-xs"
                        >
                          <div>
                            <div className="font-bold text-foreground text-xs flex items-center justify-between">
                              <span>{inv.inviterName || 'Team Admin'}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/20 text-primary font-bold">
                                {inv.role || 'Member'}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                              Invited you to project <strong className="text-foreground">{inv.projectName}</strong> in <em className="text-foreground">{inv.orgName}</em>.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleAcceptInvite(inv)}
                              disabled={actioningToken === (inv.id || inv.token)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {actioningToken === (inv.id || inv.token) ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Accept &amp; Join
                            </button>
                            <button
                              onClick={() => handleDeclineInvite(inv)}
                              disabled={actioningToken === (inv.id || inv.token)}
                              className="py-1.5 px-3 rounded-lg border border-border hover:bg-accent text-xs font-semibold text-muted-foreground transition-all disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Task Due Date Alerts Section (Overdue, 0, 1, 2, 3 days left) */}
                  {!clearedNotifications && taskDueAlerts.length > 0 && (
                    <div className="space-y-2 pb-2">
                      <div className="text-[11px] font-bold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-primary">
                          <Clock className="w-3.5 h-3.5" /> Task Due Date Alerts ({taskDueAlerts.length})
                        </span>
                        <Link
                          href="/app/tasks"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium"
                        >
                          View all &rarr;
                        </Link>
                      </div>

                      <div className="space-y-1.5">
                        {taskDueAlerts.map((alert) => (
                          <Link
                            key={alert.id}
                            href={`/app/tasks/${alert.taskId}`}
                            onClick={() => setNotificationsOpen(false)}
                            className="p-2.5 rounded-xl bg-card border border-border/70 hover:border-primary/40 hover:bg-accent/40 block text-xs space-y-1 transition-all group shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">
                                {alert.title}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${alert.badgeClass}`}>
                                {alert.badgeText}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug">
                              {alert.description}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {((clearedNotifications || taskDueAlerts.length === 0) && pendingInvitations.length === 0) && (
                    <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500/80" />
                      <span className="font-bold text-foreground">All caught up!</span>
                      <span className="text-[11px]">No active due date alerts or pending invitations.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Link */}
          <Link
            href="/app/settings"
            className="flex items-center gap-2 p-0.5 rounded-xl hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer"
            title="Profile & Settings"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.firstName || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-primary/40 shadow-xs"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            )}
          </Link>
        </div>
      </header>
    </>
  )
}
