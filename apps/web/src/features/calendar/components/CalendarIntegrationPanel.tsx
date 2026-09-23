'use client'

import React, { useEffect, useState } from 'react'
import {
  Calendar as CalendarIcon,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Settings2,
  Clock,
  Bell,
  ArrowRightLeft,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  HelpCircle
} from 'lucide-react'
import { useCalendarStore, CalendarConnection } from '@/stores/calendar-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useAuthStore } from '@/stores/auth-store'

interface CalendarIntegrationPanelProps {
  onSuccess?: (msg: string) => void
  compact?: boolean
}

export function CalendarIntegrationPanel({ onSuccess, compact = false }: CalendarIntegrationPanelProps) {
  const { currentWorkspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const {
    connections,
    calendars,
    policy,
    isLoading,
    isSyncing,
    error,
    fetchConnections,
    fetchCalendars,
    getAuthUrl,
    connectWithPopup,
    createDedicatedCalendar,
    clearCalendarEvents,
    connectViaSupabase,
    saveDirectTokens,
    fetchPolicy,
    updatePolicy,
    triggerSync,
    disconnect,
  } = useCalendarStore()

  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [copiedUri, setCopiedUri] = useState(false)
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false)
  const [showVerificationHelp, setShowVerificationHelp] = useState(false)
  const [showDirectSetup, setShowDirectSetup] = useState(false)
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [isCreatingCal, setIsCreatingCal] = useState(false)
  const [isClearingEvents, setIsClearingEvents] = useState(false)
  const [showGCalHelp, setShowGCalHelp] = useState(false)
  const [directAccessToken, setDirectAccessToken] = useState('')
  const [isSubmittingDirectToken, setIsSubmittingDirectToken] = useState(false)
  const [showDirectTokenForm, setShowDirectTokenForm] = useState(false)
  const [localPolicy, setLocalPolicy] = useState({
    syncTasks: true,
    syncProjects: true,
    syncDeadlines: true,
    syncReminders: true,
    importExternalEvents: false,
    exportTaskflowEvents: true,
    defaultTaskDurationMinutes: 30,
    defaultReminderMinutes: 30,
    deleteExternalOnTaskDelete: true,
  })
  const [isSavingPolicy, setIsSavingPolicy] = useState(false)
  const [bannerNotice, setBannerNotice] = useState<string | null>(null)

  useEffect(() => {
    fetchConnections()
    fetchPolicy(currentWorkspace?.id).then((p) => {
      if (p) {
        setLocalPolicy({
          syncTasks: p.syncTasks ?? true,
          syncProjects: p.syncProjects ?? true,
          syncDeadlines: p.syncDeadlines ?? true,
          syncReminders: p.syncReminders ?? true,
          importExternalEvents: p.importExternalEvents ?? false,
          exportTaskflowEvents: p.exportTaskflowEvents ?? true,
          defaultTaskDurationMinutes: p.defaultTaskDurationMinutes ?? 30,
          defaultReminderMinutes: p.defaultReminderMinutes ?? 30,
          deleteExternalOnTaskDelete: p.deleteExternalOnTaskDelete ?? true,
        })
      }
    })
  }, [currentWorkspace?.id])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CALENDAR_CONNECTED') {
        setIsConnectingGoogle(false)
        fetchConnections()
        notify('Google Calendar connected successfully!')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [fetchConnections])

  const notify = (msg: string) => {
    setBannerNotice(msg)
    if (onSuccess) onSuccess(msg)
    setTimeout(() => setBannerNotice(null), 4000)
  }

  const handleConnect = async (provider: 'google' | 'microsoft') => {
    try {
      const url = await getAuthUrl(provider, currentWorkspace?.id)
      if (url) {
        window.location.href = url
      }
    } catch (err: any) {
      notify(`Unable to initiate ${provider} authentication: ${err.message || 'Error'}`)
    }
  }

  const handleConnectGoogle = async () => {
    try {
      setIsConnectingGoogle(true)
      await connectWithPopup('google', currentWorkspace?.id)
    } catch (err: any) {
      notify(`Connection error: ${err.message || 'Error'}`)
      setIsConnectingGoogle(false)
    }
  }

  const handleCreateDedicatedCalendar = async (connId: string) => {
    setIsCreatingCal(true)
    try {
      const newCal = await createDedicatedCalendar(connId, 'TaskFlow')
      notify(`Created dedicated "${newCal.name}" calendar in Google! Your college and personal calendars remain untouched.`)
    } catch (err: any) {
      notify(`Failed to create calendar: ${err.message || 'Error'}`)
    } finally {
      setIsCreatingCal(false)
    }
  }

  const handleClearTaskFlowEvents = async (connId: string) => {
    if (!confirm('Clear all tasks previously synced by TaskFlow from this Google Calendar?')) return
    setIsClearingEvents(true)
    try {
      const res = await clearCalendarEvents(connId)
      notify(res.message || `Cleared ${res.deletedCount} TaskFlow events.`)
    } catch (err: any) {
      notify(`Failed to clear events: ${err.message || 'Error'}`)
    } finally {
      setIsClearingEvents(false)
    }
  }

  const handleCopyUri = () => {
    const uri = typeof window !== 'undefined'
      ? `${window.location.origin}/app/calendar/callback`
      : 'http://localhost:3000/app/calendar/callback'
    navigator.clipboard.writeText(uri)
    setCopiedUri(true)
    setTimeout(() => setCopiedUri(false), 2500)
  }

  const handleSaveDirectToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directAccessToken.trim()) return
    setIsSubmittingDirectToken(true)
    try {
      await saveDirectTokens('google', directAccessToken.trim())
      notify('Google Calendar connected successfully via access token!')
      setDirectAccessToken('')
      setShowDirectTokenForm(false)
    } catch (err: any) {
      notify(`Connection failed: ${err.message || 'Invalid token'}`)
    } finally {
      setIsSubmittingDirectToken(false)
    }
  }

  const handleManualSync = async (conn: CalendarConnection) => {
    setSyncingId(conn.id)
    try {
      const res = await triggerSync(conn.id)
      notify(`Sync completed: ${res.eventsCreated} created, ${res.eventsUpdated} updated`)
    } catch (err: any) {
      notify(`Sync failed: ${err.message || 'Error'}`)
    } finally {
      setSyncingId(null)
    }
  }

  const handleDisconnect = async (conn: CalendarConnection) => {
    if (!confirm(`Are you sure you want to disconnect ${conn.provider} calendar?`)) return
    try {
      await disconnect(conn.id)
      notify(`${conn.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'} disconnected successfully.`)
    } catch (err: any) {
      notify(`Disconnect failed: ${err.message || 'Error'}`)
    }
  }

  const handleSavePolicy = async () => {
    setIsSavingPolicy(true)
    try {
      await updatePolicy({
        ...localPolicy,
        workspaceId: currentWorkspace?.id,
      })
      notify('Calendar sync preferences updated successfully!')
    } catch (err: any) {
      notify(`Failed to save preferences: ${err.message || 'Error'}`)
    } finally {
      setIsSavingPolicy(false)
    }
  }

  const googleConn = connections.find((c) => c.provider.toLowerCase() === 'google')
  const microsoftConn = connections.find((c) => c.provider.toLowerCase() === 'microsoft')

  return (
    <div className="space-y-4">
      {bannerNotice && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-2.5 rounded-xl text-xs font-medium backdrop-blur-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Universal Calendar Live Feed Card */}
      <div className="rounded-2xl p-4 border border-primary/30 bg-primary/5 backdrop-blur-md shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-foreground">Universal Calendar Subscription Feed</h3>
                <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Instant Sync
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sync with Google Calendar, Apple Calendar, or Outlook for all team members with zero OAuth errors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                `${typeof window !== 'undefined' ? window.location.origin : 'https://task-flow-seven-ochre.vercel.app'}/api/v1/calendar/feed/${user?.id || 'me'}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Subscribe in Google Calendar</span>
            </a>

            <button
              type="button"
              onClick={() => {
                const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://task-flow-seven-ochre.vercel.app'}/api/v1/calendar/feed/${user?.id || 'me'}`
                navigator.clipboard.writeText(url)
                setCopiedFeedUrl(true)
                setTimeout(() => setCopiedFeedUrl(false), 2500)
              }}
              className="inline-flex items-center justify-center gap-1.5 bg-card hover:bg-muted border border-border px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground transition-all cursor-pointer"
            >
              {copiedFeedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFeedUrl ? 'Copied Feed URL!' : 'Copy iCal URL'}</span>
            </button>
          </div>
        </div>

        {/* OAuth Verification / Test Users Accordion */}
        <div className="pt-1 border-t border-border/40">
          <button
            type="button"
            onClick={() => setShowVerificationHelp(!showVerificationHelp)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Why did other users see &quot;Error 403: access_denied - not completed Google verification&quot;?</span>
            {showVerificationHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showVerificationHelp && (
            <div className="mt-2 p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground space-y-2 animate-fade-in leading-relaxed">
              <p className="font-semibold text-foreground">
                How to allow other team members to connect Google Calendar:
              </p>
              <p>
                In Google Cloud Console, any app requesting calendar scopes starts in <strong>&quot;Testing&quot;</strong> status. Under Google security rules, only developer-approved accounts can log in until published.
              </p>
              <div className="space-y-1.5 pl-2 border-l-2 border-primary/40">
                <p>
                  <strong>Option 1 (Add team members):</strong> Go to Google Cloud Console &rarr; <em>APIs &amp; Services</em> &rarr; <em>OAuth consent screen</em> &rarr; <em>Test users</em> &rarr; click <strong>+ ADD USERS</strong> and enter <code className="text-primary font-mono text-[10px] bg-primary/10 px-1 py-0.5 rounded">mohamedakthar260@gmail.com</code>.
                </p>
                <p>
                  <strong>Option 2 (Publish App for everyone):</strong> Click <strong>&quot;PUBLISH APP&quot;</strong> on the OAuth consent screen to make it accessible to all Google users.
                </p>
                <p>
                  <strong>Option 3 (Instant zero-config sync):</strong> Use the <strong>&quot;Subscribe in Google Calendar&quot;</strong> button above! It uses the standard live iCal calendar feed which works 100% reliably for everyone without requiring any OAuth scopes or verification.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Google Calendar Card */}
        <div className="relative rounded-2xl p-4 border border-border/80 bg-card/70 backdrop-blur-md shadow-xs flex flex-col justify-between hover:border-border transition-all">
          <div>
            <div className="flex items-center justify-between gap-2.5 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="3" fill="#4285F4" />
                    <path d="M7 2v4M17 2v4M3 9h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    <text x="12" y="17" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">31</text>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                    Google Calendar
                    {googleConn && (
                      <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Connected
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                    {googleConn?.providerEmail ? googleConn.providerEmail : 'Personal & Google Workspace'}
                  </p>
                </div>
              </div>
            </div>

            {googleConn ? (
              <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Status:</span>
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    {googleConn.status || 'ACTIVE'}
                  </span>
                </div>
                {googleConn.lastSyncAt && (
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>Last Synced:</span>
                    <span className="text-foreground font-medium">
                      {new Date(googleConn.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {calendars[googleConn.id] && calendars[googleConn.id].length > 0 && (() => {
                  const rawList = calendars[googleConn.id]
                  const sortedList = [...rawList].sort((a, b) => {
                    const aIsTf = a.name.toLowerCase().includes('taskflow')
                    const bIsTf = b.name.toLowerCase().includes('taskflow')
                    if (aIsTf && !bIsTf) return -1
                    if (!aIsTf && bIsTf) return 1
                    if (a.isPrimary && !b.isPrimary) return -1
                    if (!a.isPrimary && b.isPrimary) return 1
                    return a.name.localeCompare(b.name)
                  })

                  const hasDedicated = sortedList.some(c => c.name.toLowerCase().includes('taskflow'))
                  const currentTarget =
                    policy?.externalCalendarId ||
                    policy?.targetCalendarId ||
                    (sortedList.find(c => c.isPrimary)?.externalCalendarId ||
                      sortedList.find(c => c.isPrimary)?.id ||
                      sortedList[0]?.externalCalendarId ||
                      sortedList[0]?.id ||
                      'primary')

                  return (
                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Target Google Calendar
                        </label>
                        {!hasDedicated && (
                          <button
                            type="button"
                            onClick={() => handleCreateDedicatedCalendar(googleConn.id)}
                            disabled={isCreatingCal}
                            className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{isCreatingCal ? 'Creating...' : '+ New "TaskFlow" Calendar'}</span>
                          </button>
                        )}
                      </div>

                      <select
                        className="w-full bg-background/80 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        value={currentTarget}
                        onChange={(e) =>
                          updatePolicy({
                            externalCalendarId: e.target.value,
                            targetCalendarId: e.target.value,
                          })
                        }
                      >
                        {sortedList.map((cal) => {
                          const val = cal.externalCalendarId || cal.id
                          return (
                            <option key={cal.id} value={val}>
                              {cal.name.toLowerCase().includes('taskflow') ? '⭐ ' : ''}
                              {cal.name} {cal.isPrimary ? '(Primary Account)' : ''}
                            </option>
                          )
                        })}
                      </select>

                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Tasks sync only to this selected calendar. Create a separate <strong>"TaskFlow"</strong> calendar to keep your personal &amp; college class calendars 100% clean.
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleCreateDedicatedCalendar(googleConn.id)}
                          disabled={isCreatingCal}
                          className="px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-[10px] font-medium text-foreground transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Plus className="w-2.5 h-2.5 text-primary" />
                          <span>{isCreatingCal ? 'Creating...' : 'Create New Fresh Calendar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleClearTaskFlowEvents(googleConn.id)}
                          disabled={isClearingEvents}
                          className="px-2 py-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Delete all TaskFlow events from this calendar"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>{isClearingEvents ? 'Clearing...' : 'Clear Synced Events'}</span>
                        </button>
                      </div>

                      {/* Google Calendar Management Help Accordion */}
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowGCalHelp(!showGCalHelp)}
                          className="text-[10px] text-muted-foreground/80 hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>How to delete or hide calendars in Google Calendar?</span>
                          {showGCalHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {showGCalHelp && (
                          <div className="mt-1.5 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-[10px] text-muted-foreground space-y-1 animate-fade-in leading-relaxed">
                            <p className="font-semibold text-foreground">To delete a calendar in Google Calendar:</p>
                            <ol className="list-decimal list-inside space-y-0.5 pl-0.5">
                              <li>Open <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">calendar.google.com ↗</a></li>
                              <li>Under <strong>My calendars</strong> on the left, hover over the calendar.</li>
                              <li>Click the three dots (<span className="font-bold">⋮</span>) &rarr; <strong>Settings and sharing</strong>.</li>
                              <li>Scroll to the very bottom and click <strong>Delete</strong>.</li>
                            </ol>
                            <p className="text-[9px] pt-1 text-muted-foreground/70">
                              Tip: You can also uncheck the box next to any calendar in Google Calendar to show/hide its events without deleting it.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Sync TaskFlow tasks, project deadlines, and due-date alerts with Google Calendar.
              </p>
            )}
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-border/50">
            {googleConn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleManualSync(googleConn)}
                  disabled={syncingId === googleConn.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingId === googleConn.id ? 'animate-spin' : ''}`} />
                  <span>{syncingId === googleConn.id ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                <button
                  onClick={() => handleDisconnect(googleConn)}
                  className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Disconnect Google Calendar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isConnectingGoogle ? 'Opening Google Sign-In...' : 'Connect Google Calendar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Microsoft Outlook Calendar Card */}
        <div className="relative rounded-2xl p-4 border border-border/80 bg-card/70 backdrop-blur-md shadow-xs flex flex-col justify-between hover:border-border transition-all">
          <div>
            <div className="flex items-center justify-between gap-2.5 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M14 4h6a2 2 0 012 2v12a2 2 0 01-2 2h-6V4z" fill="#0078D4" />
                    <path d="M2 7a2 2 0 012-2h10v14H4a2 2 0 01-2-2V7z" fill="#107C41" />
                    <circle cx="8" cy="12" r="3" fill="#fff" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                    Microsoft Outlook
                    <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                      Coming Soon
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                    Personal, Work &amp; School 365
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Connect Outlook or Microsoft 365 business calendar with delta query sync and Teams meeting links.
            </p>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-border/50">
            <button
              disabled
              className="w-full inline-flex items-center justify-center gap-2 bg-muted/60 text-muted-foreground border border-border/70 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-not-allowed opacity-75"
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Microsoft Outlook Coming Soon</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Policy Preferences */}
      <div className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-md p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Two-Way Synchronization Policy</h3>
              <p className="text-[11px] text-muted-foreground">Configure which events and changes synchronize automatically.</p>
            </div>
          </div>
          <button
            onClick={handleSavePolicy}
            disabled={isSavingPolicy}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSavingPolicy ? 'Saving...' : 'Save Policy'}</span>
          </button>
        </div>

        {/* Toggles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer">
            <div>
              <span className="text-xs font-bold text-foreground block">Sync Tasks</span>
              <span className="text-[10px] text-muted-foreground">Export tasks with due dates</span>
            </div>
            <input
              type="checkbox"
              checked={localPolicy.syncTasks}
              onChange={(e) => setLocalPolicy({ ...localPolicy, syncTasks: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer">
            <div>
              <span className="text-xs font-bold text-foreground block">Sync Projects</span>
              <span className="text-[10px] text-muted-foreground">Export deadlines & milestones</span>
            </div>
            <input
              type="checkbox"
              checked={localPolicy.syncProjects}
              onChange={(e) => setLocalPolicy({ ...localPolicy, syncProjects: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer">
            <div>
              <span className="text-xs font-bold text-foreground block">Sync Reminders</span>
              <span className="text-[10px] text-muted-foreground">Popups & notifications</span>
            </div>
            <input
              type="checkbox"
              checked={localPolicy.syncReminders}
              onChange={(e) => setLocalPolicy({ ...localPolicy, syncReminders: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer">
            <div>
              <span className="text-xs font-bold text-foreground block">Import External Events</span>
              <span className="text-[10px] text-muted-foreground">Bring meetings into TaskFlow</span>
            </div>
            <input
              type="checkbox"
              checked={localPolicy.importExternalEvents}
              onChange={(e) => setLocalPolicy({ ...localPolicy, importExternalEvents: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer">
            <div>
              <span className="text-xs font-bold text-foreground block">Export TaskFlow Events</span>
              <span className="text-[10px] text-muted-foreground">Create external events</span>
            </div>
            <input
              type="checkbox"
              checked={localPolicy.exportTaskflowEvents}
              onChange={(e) => setLocalPolicy({ ...localPolicy, exportTaskflowEvents: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer">
            <div>
              <span className="text-xs font-bold text-foreground block">Delete on Task Delete</span>
              <span className="text-[10px] text-muted-foreground">Remove external calendar entry</span>
            </div>
            <input
              type="checkbox"
              checked={localPolicy.deleteExternalOnTaskDelete}
              onChange={(e) => setLocalPolicy({ ...localPolicy, deleteExternalOnTaskDelete: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
          </label>
        </div>

        {/* Durations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-primary" />
              Default Task Duration (minutes)
            </label>
            <input
              type="number"
              min={15}
              max={480}
              step={15}
              value={localPolicy.defaultTaskDurationMinutes}
              onChange={(e) => setLocalPolicy({ ...localPolicy, defaultTaskDurationMinutes: parseInt(e.target.value) || 30 })}
              className="w-full bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Bell className="w-3 h-3 text-rose-400" />
              Default Reminder Alert (minutes before)
            </label>
            <input
              type="number"
              min={0}
              max={1440}
              step={5}
              value={localPolicy.defaultReminderMinutes}
              onChange={(e) => setLocalPolicy({ ...localPolicy, defaultReminderMinutes: parseInt(e.target.value) || 15 })}
              className="w-full bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
