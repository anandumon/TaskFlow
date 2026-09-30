'use client'

import React from 'react'
import {
  Users2,
  Activity,
  Shield,
  FolderKanban,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { MemberItem, TeamItem } from './types'

interface TeamsAnalyticsViewProps {
  members: MemberItem[]
  teams: TeamItem[]
  projectsCount: number
}

export function TeamsAnalyticsView({
  members,
  teams,
  projectsCount,
}: TeamsAnalyticsViewProps) {
  const total = members.length
  const online = members.filter((m) => m.isOnline).length
  const offline = total - online
  const onlinePct = total > 0 ? Math.round((online / total) * 100) : 0

  const owners = members.filter((m) => m.isOwner || m.role === 'Owner').length
  const admins = members.filter((m) => m.role === 'Admin').length
  const managers = members.filter((m) => m.role === 'Manager').length
  const standardMembers = members.filter((m) => m.role === 'Member').length
  const guests = members.filter((m) => m.role === 'Guest').length
  const pending = members.filter(
    (m) => m.isInvitation || m.status === 'Pending Invitation'
  ).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-base font-bold text-foreground">Organization &amp; Team Analytics</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time metrics on team capacity, presence, and organizational distribution.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total People */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Workforce</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-foreground">{total}</div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{total - pending} active accounts</span>
            </div>
          </div>
        </div>

        {/* Card 2: Presence */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Online Presence</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-foreground">{onlinePct}%</div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{online} online • {offline} offline</span>
            </div>
          </div>
        </div>

        {/* Card 3: Teams & Depts */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Functional Teams</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-foreground">{teams.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Across active departments
            </div>
          </div>
        </div>

        {/* Card 4: Pending Invites */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pending Invites</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-foreground">{pending}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Awaiting verification/acceptance
            </div>
          </div>
        </div>
      </div>

      {/* Role Breakdown Distribution */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-foreground">Role Distribution Breakdown</h3>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex shadow-inner">
          {owners > 0 && (
            <div
              style={{ width: `${(owners / total) * 100}%` }}
              className="bg-amber-500 h-full"
              title={`Owners: ${owners}`}
            />
          )}
          {admins > 0 && (
            <div
              style={{ width: `${(admins / total) * 100}%` }}
              className="bg-primary h-full"
              title={`Admins: ${admins}`}
            />
          )}
          {managers > 0 && (
            <div
              style={{ width: `${(managers / total) * 100}%` }}
              className="bg-indigo-500 h-full"
              title={`Managers: ${managers}`}
            />
          )}
          {standardMembers > 0 && (
            <div
              style={{ width: `${(standardMembers / total) * 100}%` }}
              className="bg-teal-500 h-full"
              title={`Members: ${standardMembers}`}
            />
          )}
          {guests > 0 && (
            <div
              style={{ width: `${(guests / total) * 100}%` }}
              className="bg-slate-400 h-full"
              title={`Guests: ${guests}`}
            />
          )}
          {pending > 0 && (
            <div
              style={{ width: `${(pending / total) * 100}%` }}
              className="bg-rose-400 h-full"
              title={`Pending: ${pending}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-muted-foreground font-medium">Owner ({owners})</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground font-medium">Admin ({admins})</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground font-medium">Manager ({managers})</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <span className="text-muted-foreground font-medium">Member ({standardMembers})</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-muted-foreground font-medium">Guest ({guests})</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-muted-foreground font-medium">Pending ({pending})</span>
          </div>
        </div>
      </div>
    </div>
  )
}
