'use client'

import React, { useState, useMemo } from 'react'
import { X, Search, MessageSquare, Check, User } from 'lucide-react'
import { Portal } from '@/components/ui/portal'

interface MemberOption {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role?: string
  isOnline?: boolean
}

interface NewDirectMessageModalProps {
  isOpen: boolean
  onClose: () => void
  members: MemberOption[]
  currentUserId?: string
  onSelectMember: (member: MemberOption) => void
}

export function NewDirectMessageModal({
  isOpen,
  onClose,
  members,
  currentUserId,
  onSelectMember,
}: NewDirectMessageModalProps) {
  const [search, setSearch] = useState('')

  if (!isOpen) return null

  const filteredMembers = members.filter((m) => {
    if (currentUserId && (m.id === currentUserId || (m as any).userId === currentUserId)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q))
    )
  })

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">New Message</h3>
                <p className="text-xs text-muted-foreground">
                  Start a direct private message with any team member.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search or enter email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Member List */}
          <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {filteredMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No team members found matching your search.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const initials = m.name?.substring(0, 2).toUpperCase() || 'U'
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectMember(m)
                      onClose()
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-accent transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="relative shrink-0">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                            {initials}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                            m.isOnline ? 'bg-emerald-500' : 'border border-muted-foreground/60'
                          }`}
                        />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {m.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{m.email}</div>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold shrink-0">
                      {m.role || 'Member'}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}
