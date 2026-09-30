'use client'

import React from 'react'
import { Crown, Shield, User, Users, Mail } from 'lucide-react'
import { MemberItem } from './types'

interface OrgChartViewProps {
  members: MemberItem[]
  orgName?: string
}

export function OrgChartView({ members, orgName }: OrgChartViewProps) {
  const owners = members.filter((m) => m.isOwner || m.role === 'Owner')
  const adminsAndManagers = members.filter(
    (m) => !m.isOwner && (m.role === 'Admin' || m.role === 'Manager')
  )
  const regularMembers = members.filter(
    (m) => !m.isOwner && m.role !== 'Admin' && m.role !== 'Manager'
  )

  const renderCard = (m: MemberItem) => {
    return (
      <div
        key={m.id}
        className="relative group bg-card border border-border/80 hover:border-primary/60 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all w-60 text-left flex items-center gap-3"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          {m.avatarUrl ? (
            <img
              src={m.avatarUrl}
              alt={m.name}
              className="w-10 h-10 rounded-xl object-cover shadow-2xs border border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-primary text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              {m.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Status Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
              m.isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            }`}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground truncate">{m.name}</span>
            {m.isOwner && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{m.email}</div>
          <div className="mt-1 flex items-center gap-1">
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                m.isOwner
                  ? 'bg-amber-500/15 text-amber-500'
                  : m.role === 'Admin'
                  ? 'bg-primary/15 text-primary'
                  : m.role === 'Manager'
                  ? 'bg-indigo-500/15 text-indigo-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {m.role}
            </span>
            {m.projectName && (
              <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">
                • {m.projectName}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 py-4 animate-fade-in overflow-x-auto custom-scrollbar">
      {/* Chart Header */}
      <div className="text-center max-w-md mx-auto space-y-1">
        <h3 className="text-base font-bold text-foreground">
          {orgName || 'Organization'} Hierarchy Tree
        </h3>
        <p className="text-xs text-muted-foreground">
          Reporting structure and organizational governance flow.
        </p>
      </div>

      {/* Tier 1: Apex (Owner) */}
      <div className="flex flex-col items-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-1">
          <Crown className="w-3 h-3" />
          <span>Leadership &amp; Ownership</span>
        </div>
        <div className="flex justify-center gap-4 flex-wrap">
          {owners.length > 0 ? (
            owners.map((m) => renderCard(m))
          ) : (
            <div className="text-xs text-muted-foreground">No owner designated</div>
          )}
        </div>

        {/* Vertical Connector Line */}
        {(adminsAndManagers.length > 0 || regularMembers.length > 0) && (
          <div className="w-px h-8 bg-border my-2" />
        )}
      </div>

      {/* Tier 2: Admins & Managers */}
      {adminsAndManagers.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Management &amp; Administration ({adminsAndManagers.length})</span>
          </div>
          <div className="flex justify-center gap-4 flex-wrap max-w-4xl">
            {adminsAndManagers.map((m) => renderCard(m))}
          </div>

          {/* Vertical Connector Line */}
          {regularMembers.length > 0 && <div className="w-px h-8 bg-border my-2" />}
        </div>
      )}

      {/* Tier 3: Members & Contributors */}
      {regularMembers.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Members &amp; Contributors ({regularMembers.length})</span>
          </div>
          <div className="flex justify-center gap-4 flex-wrap max-w-5xl">
            {regularMembers.map((m) => renderCard(m))}
          </div>
        </div>
      )}
    </div>
  )
}
