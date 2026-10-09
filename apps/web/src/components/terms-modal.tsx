'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  PhoneOff,
  Video,
  Lock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { useTermsStore } from '@/stores/terms-store'
import { useAuthStore } from '@/stores/auth-store'
import { Portal } from '@/components/ui/portal'

interface TermsModalProps {
  isOpen: boolean
  onClose?: () => void
  readOnly?: boolean
}

export function TermsAndConditionsModal({ isOpen, onClose, readOnly = false }: TermsModalProps) {
  const { user } = useAuthStore()
  const { status, acceptTerms, declineTerms, isLoading, closeModal } = useTermsStore()
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAccept = async () => {
    const success = await acceptTerms(user?.id)
    if (success) {
      setToastMessage('✓ Terms and Conditions accepted! Voice and video calling enabled.')
      setTimeout(() => {
        if (onClose) onClose()
        else closeModal()
      }, 1000)
    }
  }

  const handleDecline = async () => {
    const success = await declineTerms(user?.id)
    if (success) {
      setToastMessage('⚠️ Terms declined. Voice and video calling features are disabled.')
      setTimeout(() => {
        if (onClose) onClose()
        else closeModal()
      }, 1200)
    }
  }

  const toggleSection = (idx: number) => {
    setExpandedSection((prev) => (prev === idx ? null : idx))
  }

  const sections = [
    {
      title: '1. Service Scope & Platform Usage',
      icon: FileText,
      color: 'text-primary',
      summary: 'TaskFlow provides agile project management, sprint delivery, real-time collaboration, and direct peer-to-peer communications.',
      details:
        'By utilizing TaskFlow, you agree to access features in accordance with applicable laws and workspace security rules. Accounts are for authorized organization members. You agree not to distribute malicious software, reverse-engineer proprietary code, or interfere with infrastructure availability.',
    },
    {
      title: '2. Real-Time Voice & Video Calling (P2P WebRTC)',
      icon: Video,
      color: 'text-indigo-400',
      summary: 'Direct WebRTC media streams with encrypted transmission between participants.',
      details:
        'TaskFlow voice and video calling operates over direct Peer-to-Peer (P2P) WebRTC protocols. Media packets are encrypted in transit via DTLS-SRTP (AES-GCM-256). No live audio or video streams are recorded, monitored, or stored on intermediate servers without explicit prior session consent.',
    },
    {
      title: '3. Hardware & Device Permissions',
      icon: Camera,
      color: 'text-emerald-400',
      summary: 'Camera and microphone hardware are only accessed during active calls.',
      details:
        'When initiating or accepting a call, your browser will prompt for microphone and camera access. Hardware streams are active strictly during live call sessions and terminate immediately upon hanging up. You may mute audio or disable video at any moment.',
    },
    {
      title: '4. Privacy, Zero-Knowledge Security & Policy Impact',
      icon: Lock,
      color: 'text-purple-400',
      summary: 'Declining terms disables voice and video features and notifies callers.',
      details:
        'If you decline these terms and conditions, you will not be able to start or join voice or video calls. Furthermore, other workspace members who attempt to initiate a call with you will be notified that you have opted out of real-time calling features. You may review and accept these terms at any time in Settings.',
    },
    {
      title: '5. Workspace Safety, Conduct & Compliance',
      icon: ShieldCheck,
      color: 'text-amber-400',
      summary: 'Harassment-free environment compliant with GDPR, CCPA, and enterprise standards.',
      details:
        'TaskFlow enforces strict workspace safety. Inappropriate recording, harassment, or unauthorized screen captures during calls are strictly prohibited. Non-content technical metadata (such as timestamps and call duration) is logged for security diagnostics.',
    },
  ]

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-2xl max-h-[90vh] bg-card border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border/70 flex items-center justify-between shrink-0 bg-card/90">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  TaskFlow Terms & Conditions
                </h2>
                <p className="text-xs text-muted-foreground">
                  Please review and accept our platform & real-time communications agreement
                </p>
              </div>
            </div>

            {readOnly && (
              <button
                type="button"
                onClick={() => (onClose ? onClose() : closeModal())}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="mx-6 mt-4 p-3 rounded-2xl bg-primary/15 border border-primary/30 text-xs font-semibold text-primary flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Scrollable Terms Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar text-xs">
            {/* Warning Callout Regarding Decline */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Notice on Audio/Video Calling Access:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-foreground/80">
                Declining these Terms and Conditions will <strong>disable all voice and video call features</strong> for your account. Other workspace members who try to reach you via voice or video call will be informed that you have declined the calling terms. You can update your choice and accept anytime in <strong>Settings</strong>.
              </p>
            </div>

            {/* Terms Sections List */}
            <div className="space-y-3">
              {sections.map((sec, idx) => {
                const isExpanded = expandedSection === idx
                const IconComponent = sec.icon
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-muted/30 border border-border/70 hover:border-border transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(idx)}
                      className="w-full flex items-start justify-between text-left gap-3 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-lg bg-card border border-border/60 ${sec.color} shrink-0`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-xs group-hover:text-primary transition-colors">
                            {sec.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            {sec.summary}
                          </p>
                        </div>
                      </div>
                      <div className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/60 text-[11px] text-foreground/90 leading-relaxed animate-fade-in bg-card/40 p-3 rounded-xl">
                        {sec.details}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-4 border-t border-border/70 bg-card/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-muted-foreground">
              {status === 'ACCEPTED' ? (
                <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Currently Accepted
                </span>
              ) : status === 'DECLINED' ? (
                <span className="text-rose-500 font-bold flex items-center gap-1.5">
                  <PhoneOff className="w-3.5 h-3.5" /> Currently Declined (Calling Disabled)
                </span>
              ) : (
                <span>Action required: Choose to accept or decline</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {/* Decline Button */}
              {status !== 'DECLINED' && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleDecline}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>Decline Terms</span>
                </button>
              )}

              {/* Accept Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleAccept}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{status === 'ACCEPTED' ? 'Accepted' : 'Accept Terms & Continue'}</span>
              </button>

              {readOnly && (
                <button
                  type="button"
                  onClick={() => (onClose ? onClose() : closeModal())}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
