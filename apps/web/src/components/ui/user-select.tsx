'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  User,
  UserCheck,
  UserPlus,
  Users,
  Search,
  Check,
  ChevronDown,
} from 'lucide-react'
import { getFirstName } from '@/lib/utils'

export interface AssignableUser {
  id: string
  name: string
  email?: string
  role?: string
  initials: string
  color: string
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return 'TF'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getAvatarColor(name: string) {
  const colors = [
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return colors[Math.abs(hash) % colors.length]
}

export function UserSelect({
  label,
  icon: Icon = User,
  value,
  onChange,
  users,
  placeholder = 'Select a user...',
}: {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  value: string
  onChange: (val: string) => void
  users: AssignableUser[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedUser = users.find(
    (u) =>
      u.name.toLowerCase() === (value || '').toLowerCase() ||
      (u.email && u.email.toLowerCase() === (value || '').toLowerCase()) ||
      ((value || '').toLowerCase() === 'you' && (u.role === 'Current User' || u.id === 'current-user'))
  )

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-primary" /> {label}
        </label>
        <button
          type="button"
          onClick={() => {
            setIsCustomMode(!isCustomMode)
            setIsOpen(false)
          }}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
            isCustomMode
              ? 'bg-primary/15 text-primary border-primary/30 shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted'
          }`}
          title={isCustomMode ? 'Choose from workspace members' : 'Enter a manual name for non-registered user'}
        >
          {isCustomMode ? (
            <>
              <Users className="w-3 h-3 text-primary" />
              <span>Choose member</span>
            </>
          ) : (
            <>
              <UserPlus className="w-3 h-3 text-primary" />
              <span>Custom name</span>
            </>
          )}
        </button>
      </div>

      {isCustomMode ? (
        <div className="space-y-1 animate-fade-in">
          <div className="relative">
            <input
              type="text"
              placeholder={`Enter name manually for ${label.toLowerCase()} (e.g. John Doe, External Client)...`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-primary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-24 shadow-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary hover:underline px-2 py-0.5 rounded bg-primary/10 cursor-pointer"
            >
              Pick member
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground pl-1">
            Manual name for non-registered person. This will appear as {label.toLowerCase()} on the task.
          </p>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground flex items-center justify-between hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-left cursor-pointer"
          >
            {value ? (
              <div className="flex items-center gap-2 truncate">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${
                    selectedUser ? selectedUser.color : getAvatarColor(value)
                  }`}
                >
                  {selectedUser ? selectedUser.initials : getInitials(value)}
                </div>
                <span className="truncate font-medium">
                  {getFirstName(value === 'You' ? (selectedUser?.name || 'You') : value)}
                </span>
                {selectedUser?.role && (
                  <span className="text-[9px] text-muted-foreground px-1.5 py-0.2 rounded bg-muted border border-border/50 shrink-0">
                    {selectedUser.role}
                  </span>
                )}
                {!selectedUser && (
                  <span className="text-[9px] text-primary px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20 shrink-0 font-semibold">
                    Custom
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[120] bg-card border border-border rounded-2xl shadow-2xl p-1.5 space-y-1 animate-scale-in max-h-64 overflow-y-auto custom-scrollbar backdrop-blur-xl">
              <div className="p-1 border-b border-border/60 mb-1">
                <input
                  type="text"
                  placeholder="Search members or type custom name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              {/* Quick option: Assign the typed custom name if user entered any text */}
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(getFirstName(searchTerm.trim()))
                    setIsOpen(false)
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2 text-left bg-primary/10 hover:bg-primary/15 text-primary transition-colors cursor-pointer text-xs font-semibold border border-primary/25 shadow-xs mb-1"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate">
                      Assign custom name: <span className="font-bold underline text-foreground">"{getFirstName(searchTerm.trim())}"</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal">Person without a TaskFlow account</div>
                  </div>
                </button>
              )}

              {filteredUsers.length === 0 ? (
                <div className="py-2 px-2 text-center text-[11px] text-muted-foreground">
                  No matching workspace members.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isCur =
                    (value || '').toLowerCase() === u.name.toLowerCase() ||
                    (u.email && (value || '').toLowerCase() === u.email.toLowerCase()) ||
                    ((value || '').toLowerCase() === 'you' && (u.role === 'Current User' || u.id === 'current-user'))
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        onChange(getFirstName(u.name))
                        setIsOpen(false)
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left ${
                        isCur ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${u.color}`}
                        >
                          {u.initials}
                        </div>
                        <div className="truncate">
                          <div className="text-xs truncate">{getFirstName(u.name)}</div>
                          {u.email && (
                            <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {u.role && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40 font-medium">
                            {u.role}
                          </span>
                        )}
                        {isCur && <Check className="w-3.5 h-3.5 text-primary ml-1" />}
                      </div>
                    </button>
                  )
                })
              )}

              {/* Bottom option to manually enter custom name */}
              <div className="pt-1 border-t border-border/40 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true)
                    setIsOpen(false)
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-left text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Enter name manually (non-registered person)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
