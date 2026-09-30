'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  KeyRound,
  Building2,
  Layers,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface AcceptInviteModalProps {
  isOpen: boolean
  onClose: () => void
  invitation: any | null
  onAccepted: (acceptData: any) => Promise<void> | void
}

export function AcceptInviteModal({
  isOpen,
  onClose,
  invitation,
  onAccepted,
}: AcceptInviteModalProps) {
  const [referralCode, setReferralCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setReferralCode('')
      setError(null)
      setIsSubmitting(false)
    }
  }, [isOpen, invitation])

  if (!isOpen || !invitation) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanCode = referralCode.trim().toUpperCase()
    if (!cleanCode) {
      setError('Please enter your invitation referral code.')
      return
    }

    const identifier = invitation.id || invitation.token
    if (!identifier) {
      setError('Invalid invitation reference.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await apiClient.post<any>(
        `/api/v1/invitations/${encodeURIComponent(identifier)}/accept`,
        { referralCode: cleanCode }
      )
      const data = res.data || invitation
      await onAccepted(data)
      onClose()
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to accept invitation. Please check your referral code.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAutofill = () => {
    if (invitation.referralCode) {
      setReferralCode(invitation.referralCode)
      setError(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 flex items-center justify-center text-primary shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Accept Invitation
              </h3>
              <p className="text-xs text-muted-foreground">
                Enter your referral code to join the team
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invitation Summary Card */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Building2 className="w-4 h-4 text-primary" />
              <span>{invitation.orgName || invitation.organizationName || 'Organization'}</span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/25">
              {invitation.role || 'Member'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{invitation.workspaceName || 'Workspace'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{invitation.projectName || 'Project'}</span>
            </div>
          </div>

          {invitation.inviterName && (
            <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
              <span>Invited by <strong className="text-foreground">{invitation.inviterName}</strong></span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Referral Code Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Referral / Invite Code *
              </label>
              {invitation.referralCode && (
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Auto-fill code
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. TF-8K3N-7P2X"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                className="w-full px-3.5 py-3 rounded-xl bg-background border border-border text-sm font-mono tracking-widest font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs uppercase"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Check the invitation email sent to <strong>{invitation.email || 'your email'}</strong> for your unique referral code.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !referralCode.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying &amp; Joining...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Code &amp; Join Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
