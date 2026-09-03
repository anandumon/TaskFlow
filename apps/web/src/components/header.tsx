'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Bell, Plus, Sparkles, Command, HelpCircle, Calendar, CheckCircle2, Clock, Menu } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore } from '@/stores/task-store'
import { UserGuideModal } from '@/components/user-guide-modal'

interface HeaderProps {
  onOpenCommand?: () => void
  onToggleMobileSidebar?: () => void
}

export function Header({ onOpenCommand, onToggleMobileSidebar }: HeaderProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { tasks } = useTaskStore()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)

  return (
    <>
      <UserGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />

      <header className="h-14 border-b border-border/70 bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        {/* Left: Mobile hamburger & Breadcrumbs */}
        <div className="flex items-center gap-3 text-xs">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Toggle navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden sm:inline">Workspace</span>
            <span className="text-muted-foreground/50 hidden sm:inline">/</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentWorkspace?.color || '#6366F1' }}
              />
              {currentWorkspace?.name || 'Main Workspace'}
            </span>
          </div>
        </div>

        {/* Center: Search & Command Palette trigger */}
        <div className="flex-1 max-w-md mx-6">
          <button
            onClick={onOpenCommand}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 text-xs text-muted-foreground transition-all shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Search tasks, projects, roadmap...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-background border border-border text-muted-foreground">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Actions, User Guide & Notifications */}
        <div className="flex items-center gap-3">
          {/* User Guide Button */}
          <button
            onClick={() => setGuideModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-semibold text-foreground transition-all shadow-sm active:scale-95"
            title="Open Platform Guide & Feature Tour"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Guide</span>
          </button>

          {/* Quick New Task Button (Only show outside of /app/tasks) */}
          {pathname !== '/app/tasks' && (
            <Link
              href="/app/tasks"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Task</span>
            </Link>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent relative transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-2xl shadow-2xl z-50 p-3.5 animate-scale-in space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold text-foreground">Activity & Due Date Alerts</span>
                  <span
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[10px] text-primary hover:underline cursor-pointer font-semibold"
                  >
                    Dismiss
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs flex gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-[11px]">Due Date Alert: Due Today</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        &quot;Replace AccessChannel enum validation&quot; is in <strong>DONE</strong>.
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-accent/40 text-xs flex gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-[11px]">Clean Slate Ready</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        All project & task updates are saved directly to your isolated database.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
