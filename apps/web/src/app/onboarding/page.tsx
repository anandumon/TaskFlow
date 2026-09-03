'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingWizardModal } from '@/features/onboarding/components/OnboardingWizardModal'

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push('/app/home')
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0c0c0e]">
      {/* Blurred Simulated Workspace Background (matching ClickUp screenshots) */}
      <div className="absolute inset-0 flex pointer-events-none filter blur-[3px] opacity-40 select-none">
        {/* Mock Sidebar */}
        <div className="w-64 h-full border-r border-white/10 bg-[#121216] p-4 space-y-4">
          <div className="h-8 w-36 rounded-lg bg-white/10" />
          <div className="space-y-2 pt-4">
            <div className="h-6 w-44 rounded-md bg-white/5" />
            <div className="h-6 w-36 rounded-md bg-white/5" />
            <div className="h-6 w-48 rounded-md bg-white/5" />
            <div className="h-6 w-32 rounded-md bg-white/5" />
          </div>
          <div className="pt-6 space-y-2">
            <div className="h-5 w-20 rounded bg-white/10" />
            <div className="h-6 w-52 rounded-md bg-white/5" />
            <div className="h-6 w-40 rounded-md bg-white/5" />
          </div>
        </div>

        {/* Mock Main Area */}
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-white/10 bg-[#121216]/50 flex items-center px-6 justify-between">
            <div className="h-6 w-36 rounded-md bg-white/10" />
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-md bg-white/10" />
              <div className="h-7 w-7 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="p-8 space-y-4">
            <div className="h-8 w-60 rounded-lg bg-white/10" />
            <div className="space-y-2.5 pt-4">
              <div className="h-12 w-full rounded-xl bg-white/5" />
              <div className="h-12 w-full rounded-xl bg-white/5" />
              <div className="h-12 w-full rounded-xl bg-white/5" />
              <div className="h-12 w-full rounded-xl bg-white/5" />
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal onComplete={handleComplete} />
    </div>
  )
}
