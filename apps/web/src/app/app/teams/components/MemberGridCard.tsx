'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  MoreHorizontal,
  Mail,
  MessageSquare,
  Copy,
  Trash2,
  Crown,
  Shield,
  Check,
  FolderKanban,
  ExternalLink,
} from 'lucide-react'
import { MemberItem } from './types'

interface MemberGridCardProps {
  member: MemberItem
  isCurrentUser: boolean
  canManage: boolean
  onRoleChange: (id: string, newRole: MemberItem['role']) => void
  onRemove: (member: MemberItem) => void
  onCopyToken?: (token?: string) => void
}

const AVATAR_PALETTE = [
  '#4f46e5', // indigo
  '#0d9488', // teal
  '#1e293b', // slate
  '#9333ea', // purple
  '#e11d48', // red
  '#0284c7', // ocean blue
  '#ea580c', // orange
  '#059669', // emerald
  '#0891b2', // cyan
  '#d97706', // amber
  '#6366f1', // violet
  '#27272a', // zinc
  '#be185d', // pink
  '#7c3aed', // violet-600
  '#db2777', // pink-600
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#ca8a04', // yellow-600
  '#475569', // slate-600
  '#dc2626', // red-600
  '#0891b2', // cyan-600
  '#9d174d', // rose-800
  '#4338ca', // indigo-700
  '#0f766e', // teal-700
  '#b45309', // amber-700
  '#6d28d9', // purple-700
  '#be123c', // rose-700
  '#1d4ed8', // blue-700
  '#047857', // emerald-700
  '#854d0e', // yellow-700
]

function getAvatarColor(identifier: string): string {
  if (!identifier) return AVATAR_PALETTE[0]
  let hash = 5381
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) + hash) + identifier.charCodeAt(i)
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function getInitials(name: string, email: string): string {
  const clean = (name || email?.split('@')[0] || 'TF').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  if (clean.length >= 2) {
    return clean.substring(0, 2).toUpperCase()
  }
  return clean.charAt(0).toUpperCase()
}

export function MemberGridCard({
  member,
  isCurrentUser,
  canManage,
  onRoleChange,
  onRemove,
  onCopyToken,
}: MemberGridCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imageError, setImageError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const bgColor = getAvatarColor(member.email || member.name || member.id)
  const initials = getInitials(member.name, member.email)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (member.email) {
      navigator.clipboard.writeText(member.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="group relative flex flex-col justify-between w-full h-full min-h-[250px] bg-card/60 hover:bg-card border border-border/80 hover:border-border rounded-3xl p-3 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
      {/* Tile Header: Fixed Aspect-Square Tile with Initials or Image */}
      <div className="relative w-full aspect-square rounded-2xl select-none shrink-0">
        {/* Background & Avatar with overflow-hidden */}
        <div
          className="w-full h-full rounded-2xl flex items-center justify-center overflow-hidden shadow-inner"
          style={{ backgroundColor: bgColor }}
        >
          {member.avatarUrl && !imageError ? (
            <img
              src={member.avatarUrl}
              alt={member.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover rounded-2xl block"
            />
          ) : (
            <span className="text-white text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm select-none">
              {initials}
            </span>
          )}
        </div>

        {/* Top-Right Action Pill (Speech Bubble + Options) - Outside overflow-hidden */}
        <div className="absolute top-2.5 right-2.5 z-20" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen((prev) => !prev)
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 hover:bg-black/65 text-white/90 hover:text-white backdrop-blur-md transition-all shadow-md cursor-pointer border border-white/10 active:scale-95"
            title="Member options"
          >
            <Mail className="w-3 h-3" />
            <MoreHorizontal className="w-3 h-3" />
          </button>

          {/* Action Popover Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-popover/95 backdrop-blur-md border border-border rounded-2xl p-1.5 shadow-2xl z-50 animate-scale-in text-xs text-foreground space-y-0.5">
              <div className="px-2.5 py-1.5 border-b border-border/60">
                <div className="font-bold truncate text-foreground">{member.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{member.email}</div>
              </div>

              <Link
                href={`/app/messages?dm=${member.id}`}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-accent transition-colors text-foreground cursor-pointer"
                onClick={() => setIsMenuOpen(false)}
              >
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Direct Message</span>
              </Link>

              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-accent transition-colors text-foreground cursor-pointer"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Send Email</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleCopyEmail}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-accent transition-colors text-foreground cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span>{copied ? 'Email Copied!' : 'Copy Email'}</span>
                </div>
              </button>

              {member.isInvitation && member.invitationToken && onCopyToken && (
                <button
                  type="button"
                  onClick={() => {
                    onCopyToken(member.invitationToken)
                    setIsMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-accent transition-colors text-foreground cursor-pointer text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  <span>Copy Invite Token</span>
                </button>
              )}

              {canManage && !member.isOwner && !member.isInvitation && (
                <div className="pt-1 border-t border-border/60">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Change Role
                  </div>
                  {(['Admin', 'Manager', 'Member', 'Guest'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        onRoleChange(member.id, r)
                        setIsMenuOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        member.role === r ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <span>{r}</span>
                      {member.role === r && <Check className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {canManage && !member.isOwner && (
                <div className="pt-1 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      onRemove(member)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>{member.isInvitation ? 'Revoke Invite' : 'Remove Member'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Crown badge for Owner */}
        {member.isOwner && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Owner</span>
          </div>
        )}

        {/* Pending Tag for Invitations */}
        {member.isInvitation && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Pending</span>
          </div>
        )}
      </div>

      {/* Tile Footer: Name, Online/Offline Dot, Role/Project */}
      <div className="mt-3 px-1 space-y-1">
        <div className="flex items-center justify-between gap-1.5">
          <h3
            className="text-xs sm:text-sm font-semibold text-foreground truncate cursor-default"
            title={member.name}
          >
            {member.name}
          </h3>

          {/* Status Dot: green for online, hollow circle for offline */}
          <span
            className="shrink-0 flex items-center justify-center"
            title={(member.isOnline || isCurrentUser) ? 'Online' : 'Offline'}
          >
            {(member.isOnline || isCurrentUser) ? (
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-background" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground/60 bg-transparent ring-1 ring-background" />
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate max-w-[110px]" title={member.projectName || 'All Projects'}>
            {member.projectName || 'All Projects'}
          </span>

          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
              member.isOwner
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : member.role === 'Admin'
                ? 'bg-primary/15 text-primary font-bold'
                : member.role === 'Manager'
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {member.role}
          </span>
        </div>
      </div>
    </div>
  )
}
