'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
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
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { UserGuideModal } from '@/components/user-guide-modal'
import { CreateOrganizationModal } from '@/components/create-organization-modal'
import { CreateWorkspaceModal } from '@/components/create-workspace-modal'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { currentOrg, organizations, setCurrentOrg } = useOrgStore()
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspaceStore()
  const { theme, setTheme } = useTheme()

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false)
  const [createWsModalOpen, setCreateWsModalOpen] = useState(false)

  const navItems = [
    { label: 'Overview', href: '/app/home', icon: LayoutDashboard },
    { label: 'My Tasks & Board', href: '/app/tasks', icon: CheckSquare },
    { label: 'Projects', href: '/app/projects', icon: FolderKanban },
    { label: 'Sprint Calendar', href: '/app/calendar', icon: Calendar },
    { label: 'Teams & Members', href: '/app/teams', icon: Users2 },
    { label: 'Analytics', href: '/app/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/app/settings', icon: Settings },
  ]

  const renderContent = () => (
    <aside className="w-64 h-screen bg-sidebar border-r border-border flex flex-col justify-between shrink-0 select-none">
      {/* Top section */}
      <div>
        {/* Brand & Organization Selector */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md shadow-primary/20">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground">TaskFlow</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {currentOrg?.plan || 'ENTERPRISE'}
            </span>
          </div>

          {/* Org Switcher Button */}
          <div className="relative">
            <button
              onClick={() => {
                setOrgDropdownOpen(!orgDropdownOpen)
                setWsDropdownOpen(false)
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent border border-border/40 text-xs font-semibold text-foreground transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-md bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {currentOrg?.name?.charAt(0) || 'O'}
                </div>
                <span className="truncate">{currentOrg?.name || 'My Organization'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {orgDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-scale-in">
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Organizations</span>
                  <span className="text-[9px] lowercase font-normal">{organizations.length} total</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {organizations.map((org) => {
                    const isSelected = currentOrg?.id === org.id
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          setCurrentOrg(org)
                          setOrgDropdownOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${isSelected
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'hover:bg-accent text-foreground'
                          }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-4 h-4 rounded bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                            {org.name.charAt(0)}
                          </div>
                          <span className="truncate">{org.name}</span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {/* Create New Organization Button */}
                <div className="pt-1 border-t border-border/50">
                  <button
                    onClick={() => {
                      setOrgDropdownOpen(false)
                      setCreateOrgModalOpen(true)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Plus className="w-3 h-3" />
                    </div>
                    <span>Create Organization</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 px-1">
            <span className="flex items-center gap-1.5">
              <span>Workspace</span>
            </span>
            <button
              onClick={() => setCreateWsModalOpen(true)}
              className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="Add New Workspace"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setWsDropdownOpen(!wsDropdownOpen)
                setOrgDropdownOpen(false)
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-sidebar-accent/30 hover:bg-sidebar-accent border border-border/30 text-xs font-medium text-foreground transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: currentWorkspace?.color || '#6366F1' }}
                />
                <span className="truncate font-semibold">{currentWorkspace?.name || 'Workspace'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${wsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {wsDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-scale-in">
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Workspaces</span>
                  <span className="text-[9px] lowercase font-normal">{workspaces.length} total</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {workspaces.map((ws) => {
                    const isSelected = currentWorkspace?.id === ws.id
                    return (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setCurrentWorkspace(ws)
                          setWsDropdownOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${isSelected
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'hover:bg-accent text-foreground'
                          }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: ws.color || '#6366F1' }}
                          />
                          <span className="truncate">{ws.name}</span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {/* Create New Workspace Button */}
                <div className="pt-1 border-t border-border/50">
                  <button
                    onClick={() => {
                      setWsDropdownOpen(false)
                      setCreateWsModalOpen(true)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Plus className="w-3 h-3" />
                    </div>
                    <span>Create Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/app/home' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom User Guide & Profile */}
      <div className="p-3 border-t border-border/50 space-y-2">
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
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-foreground truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <UserGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
      <CreateOrganizationModal isOpen={createOrgModalOpen} onClose={() => setCreateOrgModalOpen(false)} />
      <CreateWorkspaceModal isOpen={createWsModalOpen} onClose={() => setCreateWsModalOpen(false)} />

      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex shrink-0">
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
