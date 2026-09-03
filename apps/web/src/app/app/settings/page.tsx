'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import {
  Building2,
  Briefcase,
  User,
  ShieldCheck,
  Save,
  Trash2,
  Plus,
  Users,
  Check,
  CheckCircle2,
  Bell,
  Lock,
  KeyRound,
  X
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { currentOrg, setCurrentOrg } = useOrgStore()
  const { currentWorkspace, setCurrentWorkspace, teams } = useWorkspaceStore()

  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'workspace' | 'teams' | 'security'>('profile')

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || 'Admin')
  const [lastName, setLastName] = useState(user?.lastName || 'User')
  const [jobTitle, setJobTitle] = useState('Chief System Architect')
  const [timezone, setTimezone] = useState('UTC (GMT+0:00)')

  // Org state
  const [orgName, setOrgName] = useState(currentOrg?.name || '')

  // Workspace state
  const [wsName, setWsName] = useState(currentWorkspace?.name || '')
  const [wsColor, setWsColor] = useState(currentWorkspace?.color || '#6366F1')

  // Sync with store when currentOrg or currentWorkspace loads
  React.useEffect(() => {
    if (currentOrg?.name) setOrgName(currentOrg.name)
  }, [currentOrg?.name])

  React.useEffect(() => {
    if (currentWorkspace?.name) setWsName(currentWorkspace.name)
    if (currentWorkspace?.color) setWsColor(currentWorkspace.color)
  }, [currentWorkspace?.name, currentWorkspace?.color])

  // Teams state
  const [customTeams, setCustomTeams] = useState([
    { id: '1', name: 'Core Infrastructure', memberCount: 4, color: '#6366F1' },
    { id: '2', name: 'Design & Frontend Guild', memberCount: 3, color: '#EC4899' },
    { id: '3', name: 'Product & Growth', memberCount: 2, color: '#8B5CF6' },
  ])
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamColor, setNewTeamColor] = useState('#10B981')

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Profile settings saved successfully!')
  }

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentOrg) {
      setCurrentOrg({ ...currentOrg, name: orgName })
    }
    showToast('Organization settings updated!')
  }

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentWorkspace) {
      setCurrentWorkspace({ ...currentWorkspace, name: wsName, color: wsColor })
    }
    showToast('Workspace branding updated!')
  }

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setCustomTeams(prev => [...prev, {
      id: Date.now().toString(),
      name: newTeamName.trim(),
      memberCount: 1,
      color: newTeamColor,
    }])
    setNewTeamName('')
    setIsTeamModalOpen(false)
    showToast(`Team '${newTeamName}' created!`)
  }

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'workspace', label: 'Workspace', icon: Briefcase },
    { id: 'teams', label: 'Teams & Units', icon: Users },
    { id: 'security', label: 'Security & Keys', icon: ShieldCheck },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Preferences</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your personal account, organization policies, workspace branding, and security credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/80 gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl bg-card border border-border/80 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center text-xl font-bold shadow-md">
              {firstName.charAt(0) || 'A'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Profile Avatar & Bio</h3>
              <p className="text-xs text-muted-foreground">Personalize your identity across boards and teams.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || 'admin@taskflow.dev'}
              className="w-full px-3 py-2 rounded-xl border border-input bg-muted text-muted-foreground text-xs cursor-not-allowed"
            />
          </div>

          <div className="pt-4 flex justify-end border-t border-border">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm shadow-primary/20 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <form onSubmit={handleSaveOrg} className="space-y-6 max-w-2xl bg-card border border-border/80 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Organization Overview</h3>
              <p className="text-xs text-muted-foreground">Settings for {currentOrg?.name || 'TaskFlow HQ'}.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
              {currentOrg?.plan || 'ENTERPRISE'}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organization Slug
            </label>
            <input
              type="text"
              disabled
              value={currentOrg?.slug || 'taskflow-hq'}
              className="w-full px-3 py-2 rounded-xl border border-input bg-muted text-muted-foreground text-xs cursor-not-allowed"
            />
          </div>

          <div className="pt-4 flex justify-end border-t border-border">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-95"
            >
              Update Organization
            </button>
          </div>
        </form>
      )}

      {/* Workspace Tab */}
      {activeTab === 'workspace' && (
        <form onSubmit={handleSaveWorkspace} className="space-y-6 max-w-2xl bg-card border border-border/80 p-6 rounded-2xl shadow-sm">
          <div>
            <h3 className="text-base font-bold text-foreground">Workspace Configuration</h3>
            <p className="text-xs text-muted-foreground">Current: {wsName}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace Name
            </label>
            <input
              type="text"
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace Brand Color
            </label>
            <div className="flex items-center gap-3">
              {['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setWsColor(c)}
                  className={`w-8 h-8 rounded-xl transition-transform ${wsColor === c ? 'scale-110 ring-2 ring-foreground ring-offset-2' : 'hover:scale-105'
                    }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-border">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-95"
            >
              Save Workspace
            </button>
          </div>
        </form>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-6 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Functional Teams & Guilds</h3>
              <p className="text-xs text-muted-foreground">Organize your coworkers into functional units.</p>
            </div>
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm shadow-primary/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Team
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customTeams.map((team) => (
              <div
                key={team.id}
                className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{team.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{team.memberCount} members</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Modal: Add Team */}
          {isTeamModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Create New Team
                  </h3>
                  <button
                    onClick={() => setIsTeamModalOpen(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Team Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Mobile Engineering"
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Color</label>
                    <div className="flex items-center gap-3">
                      {['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'].map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setNewTeamColor(c)}
                          className={`w-7 h-7 rounded-xl transition-transform ${newTeamColor === c ? 'scale-125 ring-2 ring-foreground' : 'hover:scale-110'
                            }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsTeamModalOpen(false)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      Create Team
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-2xl bg-card border border-border/80 p-6 rounded-2xl shadow-sm">
          <div>
            <h3 className="text-base font-bold text-foreground">Security & API Tokens</h3>
            <p className="text-xs text-muted-foreground">Manage your JWT authentication sessions and security keys.</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <KeyRound className="w-4 h-4 text-primary" /> API Access Key
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">Active</span>
            </div>
            <div className="font-mono text-[11px] bg-background p-2 rounded-lg border border-border text-muted-foreground truncate">
              tf_live_9a4b37cd16b1347519a2e7cb68377d328
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-border">
            <button
              onClick={() => showToast('API Token regenerated!')}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95"
            >
              Rotate Key
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
