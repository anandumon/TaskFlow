'use client'

import { useState } from 'react'
import {
  HelpCircle,
  X,
  Building2,
  FolderKanban,
  CheckSquare,
  GitBranch,
  Calendar,
  Users,
  Bell,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'
import { Portal } from '@/components/ui/portal'

interface UserGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  const [activeStep, setActiveStep] = useState(0)

  if (!isOpen) return null

  const steps = [
    {
      title: 'Welcome to TaskFlow',
      badge: 'Platform Tour',
      icon: Sparkles,
      color: 'from-primary to-secondary',
      content:
        'TaskFlow is an enterprise-grade project management and productivity SaaS built for modern engineering and product teams. Here is how your workspace is structured.',
      bullets: [
        'Multi-tenant architecture ensuring your data is 100% private to your organization.',
        'Zero bloat: You start with a clean slate and build projects your way.',
        'Role-Based Access Control (Owner, Admin, Manager, Member, Guest).',
      ],
    },
    {
      title: 'Organizations & Workspaces',
      badge: 'Architecture',
      icon: Building2,
      color: 'from-blue-500 to-indigo-600',
      content:
        'Organizations represent your company or entity. Workspaces are dedicated environments for functional teams or departments.',
      bullets: [
        'Organizations: Manage billing, enterprise SSO, and overall company members.',
        'Workspaces: House your specific projects, boards, sprint cycles, and custom brand colors.',
        'Seamlessly switch between multiple workspaces using the sidebar dropdown.',
      ],
    },
    {
      title: 'Multi-Stage Environment Kanban',
      badge: 'Development Lifecycle',
      icon: GitBranch,
      color: 'from-purple-500 to-pink-600',
      content:
        'Every task tracks its software release environment through all stages of development and QA verification:',
      bullets: [
        'To Do & In Progress: Initial feature implementation in the DEV environment.',
        'In Review: Track live testing across SIT (System Integration), UAT (User Acceptance), or RELEASE (Staging).',
        'Done: Automatically advances and marks deliverables as merged to MAIN (Production).',
      ],
    },
    {
      title: 'Interactive Calendar & Due Dates',
      badge: 'Time Management',
      icon: Calendar,
      color: 'from-emerald-500 to-teal-600',
      content:
        'Visualize sprint milestones, task creation dates, and deadlines on the interactive Calendar:',
      bullets: [
        'Monthly & weekly calendar views showing due dates and environment badges.',
        'Automated notifications sent when tasks are Due Today, Due Tomorrow, or Overdue.',
        'Click on any calendar day to inspect milestones and schedule new deliverables.',
      ],
    },
    {
      title: 'Team Permissions & Invites',
      badge: 'Collaboration',
      icon: Users,
      color: 'from-amber-500 to-orange-600',
      content:
        'Invite coworkers and assign granular security roles to keep projects organized:',
      bullets: [
        'Owner / Admin: Full workspace management and member access.',
        'Manager: Can create, assign, and organize project milestones.',
        'Member: Collaborate, move tasks across environments, and submit deliverables.',
      ],
    },
  ]

  const current = steps[activeStep]
  const Icon = current.icon

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl space-y-6 animate-scale-in relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80 relative z-10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${current.color} text-white flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {current.badge} &bull; Step {activeStep + 1} of {steps.length}
                </span>
                <h2 className="text-lg font-bold text-foreground mt-0.5">{current.title}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-4 relative z-10">
            <p className="text-sm text-foreground/90 leading-relaxed font-medium">
              {current.content}
            </p>

            <div className="space-y-2.5 bg-muted/40 border border-border/60 rounded-2xl p-4">
              {current.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{bullet}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step Progress Indicators & Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border/80 relative z-10">
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`h-2 rounded-full transition-all ${
                    activeStep === idx
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeStep > 0 && (
                <button
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
                >
                  Back
                </button>
              )}

              {activeStep < steps.length - 1 ? (
                <button
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold hover:opacity-95 transition-all shadow-md shadow-primary/25"
                >
                  Get Started!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
