'use client'

import React, { useState, useEffect } from 'react'
import { Users2, Plus, Shield, Mail, Crown, X, Trash2, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface Member {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Manager' | 'Member' | 'Guest'
  status: 'Active' | 'Pending Invitation'
  isOwner: boolean
}

export default function TeamsPage() {
  const { user } = useAuthStore()
  const { currentOrg } = useOrgStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Member['role']>('Member')
  const [inviteName, setInviteName] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [membersList, setMembersList] = useState<Member[]>([])

  useEffect(() => {
    if (user) {
      setMembersList([
        {
          id: user.id || 'owner',
          name: user.displayName || `${user.firstName || 'Owner'} ${user.lastName || ''}`.trim(),
          email: user.email,
          role: 'Owner',
          status: 'Active',
          isOwner: true,
        },
      ])
    }
  }, [user])

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    const newMember: Member = {
      id: Date.now().toString(),
      name: inviteName.trim() || inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'Pending Invitation',
      isOwner: false,
    }

    setMembersList(prev => [...prev, newMember])
    setInviteEmail('')
    setInviteName('')
    setIsModalOpen(false)
    setToastMessage(`Invitation sent to ${newMember.email}!`)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleRoleChange = (id: string, newRole: Member['role']) => {
    setMembersList(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m))
  }

  const handleRemoveMember = (id: string) => {
    setMembersList(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users2 className="w-6 h-6 text-primary" /> Teams & Organization Members
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage granular role permissions and team assignments for {currentOrg?.name || 'your organization'}.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Members ({membersList.length})
          </h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3 pl-6">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {membersList.map((m) => (
              <tr key={m.id} className="hover:bg-accent/40 transition-colors">
                <td className="p-3 pl-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold text-xs">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {m.name}
                        {m.isOwner && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  {m.isOwner ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Shield className="w-3 h-3" /> Owner
                    </span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value as any)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border-none cursor-pointer focus:outline-none"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Member">Member</option>
                      <option value="Guest">Guest</option>
                    </select>
                  )}
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 font-medium text-[11px] ${
                    m.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {m.status}
                  </span>
                </td>
                <td className="p-3 pr-6 text-right">
                  {!m.isOwner && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Modal: Invite Member */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" /> Invite Team Member
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Miller"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Role Permission</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Admin">Admin (Can manage workspaces & billing)</option>
                  <option value="Manager">Manager (Can manage projects & sprints)</option>
                  <option value="Member">Member (Can edit tasks & comments)</option>
                  <option value="Guest">Guest (Read-only access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
