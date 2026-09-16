'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Palette,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Sparkles,
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Clock,
  Layers,
} from 'lucide-react'
import { CustomThemeColors, ThemeId } from '@/lib/theme/types'
import { PRESET_THEME_MAP, DEFAULT_THEME_ID } from '@/lib/theme/definitions'
import { isValidHexColor, sanitizeHexColor, getContrastRatio, getContrastingForeground } from '@/lib/theme/validator'
import { useTaskFlowTheme } from '@/lib/theme/theme-context'

interface CustomThemeEditorModalProps {
  isOpen: boolean
  onClose: () => void
  initialColors?: CustomThemeColors | null
  basePresetId?: ThemeId
  onSaved?: (customTheme: CustomThemeColors) => void
}

const DEFAULT_STARTER_CUSTOM: CustomThemeColors = {
  primary: '#29ADB2',
  secondary: '#1B4965',
  accent: '#A8DADC',
  surface: '#141E28',
  background: '#0D141C',
}

export function CustomThemeEditorModal({
  isOpen,
  onClose,
  initialColors,
  basePresetId,
  onSaved,
}: CustomThemeEditorModalProps) {
  const { setThemePreference, setPreviewTheme, clearPreview, isDark, isSaving } = useTaskFlowTheme()

  // Generate sensible starting colors from current preset if available
  const getStartingColors = (): CustomThemeColors => {
    if (initialColors) return { ...initialColors }
    if (basePresetId && basePresetId !== 'CUSTOM' && PRESET_THEME_MAP[basePresetId as keyof typeof PRESET_THEME_MAP]) {
      const p = PRESET_THEME_MAP[basePresetId as keyof typeof PRESET_THEME_MAP].palette
      return {
        primary: p[2],
        secondary: p[1],
        accent: p[3],
        surface: isDark ? p[0] : '#FFFFFF',
        background: isDark ? p[0] : p[4],
      }
    }
    return { ...DEFAULT_STARTER_CUSTOM }
  }

  const [draftColors, setDraftColors] = useState<CustomThemeColors>(getStartingColors)
  const [errors, setErrors] = useState<Partial<Record<keyof CustomThemeColors, string>>>({})
  const [activePreviewTab, setActivePreviewTab] = useState<'ui' | 'task' | 'stats'>('ui')

  useEffect(() => {
    if (isOpen) {
      const starting = getStartingColors()
      setDraftColors(starting)
      setErrors({})
      // Trigger live preview
      setPreviewTheme({
        themeId: 'CUSTOM',
        themeType: 'CUSTOM',
        customTheme: starting,
      })
    } else {
      clearPreview()
    }
  }, [isOpen, basePresetId, initialColors])

  if (!isOpen) return null

  const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
    const updated = { ...draftColors, [key]: value }
    setDraftColors(updated)

    if (isValidHexColor(value)) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
      const sanitized = { ...updated, [key]: sanitizeHexColor(value) }
      // Update live CSS variables preview immediately
      setPreviewTheme({
        themeId: 'CUSTOM',
        themeType: 'CUSTOM',
        customTheme: sanitized,
      })
    } else {
      setErrors((prev) => ({ ...prev, [key]: 'Invalid HEX (#RGB or #RRGGBB)' }))
    }
  }

  const handleCancel = () => {
    clearPreview()
    onClose()
  }

  const handleReset = () => {
    const defaultColors = { ...DEFAULT_STARTER_CUSTOM }
    setDraftColors(defaultColors)
    setErrors({})
    setPreviewTheme({
      themeId: 'CUSTOM',
      themeType: 'CUSTOM',
      customTheme: defaultColors,
    })
  }

  const handleSave = async () => {
    // Validate all fields
    const newErrors: Partial<Record<keyof CustomThemeColors, string>> = {}
    for (const key of ['primary', 'secondary', 'accent', 'surface', 'background'] as const) {
      if (!isValidHexColor(draftColors[key])) {
        newErrors[key] = 'Valid HEX code required'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const sanitized: CustomThemeColors = {
      primary: sanitizeHexColor(draftColors.primary),
      secondary: sanitizeHexColor(draftColors.secondary),
      accent: sanitizeHexColor(draftColors.accent),
      surface: sanitizeHexColor(draftColors.surface),
      background: sanitizeHexColor(draftColors.background),
    }

    const success = await setThemePreference('CUSTOM', 'CUSTOM', sanitized)
    if (success) {
      if (onSaved) onSaved(sanitized)
      onClose()
    }
  }

  // Accessibility contrast check for primary button text
  const primaryContrast = getContrastRatio(draftColors.primary, getContrastingForeground(draftColors.primary))
  const isContrastWarning = primaryContrast < 3.0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between bg-card/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                Custom Theme Studio
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  Live Preview
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Personalize your workspace palette. Changes preview live in the simulation below.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 p-5 sm:p-6 space-y-5 bg-card/40">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Palette Foundation
              </h3>
              <button
                onClick={handleReset}
                type="button"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* 5 Color Pickers */}
            <div className="space-y-3.5">
              {[
                { key: 'primary' as const, label: 'Primary Accent', desc: 'Main brand highlights, active tabs & CTA buttons' },
                { key: 'secondary' as const, label: 'Secondary Tone', desc: 'Badges, sub-headings, and secondary tags' },
                { key: 'accent' as const, label: 'Glow / Accent', desc: 'Active focus rings, glow effects & hover states' },
                { key: 'surface' as const, label: 'Surface / Card', desc: 'Containers, task cards, dialogs & dropdowns' },
                { key: 'background' as const, label: 'App Background', desc: 'Main canvas background & sidebar base' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="p-3 rounded-2xl bg-background/60 border border-border/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground block">{label}</label>
                      <span className="text-[10px] text-muted-foreground block">{desc}</span>
                    </div>
                    {/* Visual Color Input */}
                    <div className="relative flex items-center shrink-0">
                      <input
                        type="color"
                        value={isValidHexColor(draftColors[key]) ? sanitizeHexColor(draftColors[key]) : '#000000'}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-8 h-8 rounded-xl cursor-pointer border border-border/80 p-0 bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Hex Text Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs font-mono text-muted-foreground">HEX:</span>
                    <input
                      type="text"
                      value={draftColors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      placeholder="#7C3AED"
                      maxLength={7}
                      className={`flex-1 px-2.5 py-1 text-xs font-mono rounded-lg bg-card border ${
                        errors[key] ? 'border-rose-500 focus:ring-rose-500' : 'border-border/80 focus:ring-primary'
                      } text-foreground focus:outline-none focus:ring-1`}
                    />
                  </div>
                  {errors[key] && (
                    <p className="text-[10px] font-medium text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors[key]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Accessibility Note */}
            {isContrastWarning && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  The selected Primary color may have lower contrast on white/dark text. TaskFlow will automatically
                  adapt text color to preserve legibility.
                </span>
              </div>
            )}
          </div>

          {/* Live Preview Column (7 cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 bg-background/50 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Interactive Preview Simulation
                  </h3>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    onClick={() => setActivePreviewTab('ui')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      activePreviewTab === 'ui' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    UI Elements
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('task')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      activePreviewTab === 'task' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Task Card
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('stats')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      activePreviewTab === 'stats' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Dashboard Stats
                  </button>
                </div>
              </div>

              {/* Miniature Simulated Screen */}
              <div
                className="rounded-2xl border border-border p-4 shadow-sm transition-all space-y-4"
                style={{
                  backgroundColor: draftColors.background,
                  borderColor: draftColors.secondary + '40',
                }}
              >
                {/* Simulated Navbar */}
                <div
                  className="p-3 rounded-xl border flex items-center justify-between backdrop-blur-md"
                  style={{
                    backgroundColor: draftColors.surface,
                    borderColor: draftColors.secondary + '30',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs"
                      style={{
                        backgroundColor: draftColors.primary,
                        color: getContrastingForeground(draftColors.primary),
                      }}
                    >
                      TF
                    </div>
                    <span className="text-xs font-extrabold" style={{ color: getContrastingForeground(draftColors.surface) }}>
                      TaskFlow Workspace
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: draftColors.accent + '25',
                        color: draftColors.accent,
                      }}
                    >
                      Pro Plan
                    </span>
                  </div>
                </div>

                {activePreviewTab === 'ui' && (
                  <div className="space-y-3">
                    {/* Buttons Demo */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Buttons &amp; Actions</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95"
                          style={{
                            backgroundColor: draftColors.primary,
                            color: getContrastingForeground(draftColors.primary),
                          }}
                        >
                          Primary Action
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors"
                          style={{
                            backgroundColor: draftColors.surface,
                            borderColor: draftColors.primary + '50',
                            color: draftColors.primary,
                          }}
                        >
                          Secondary Outline
                        </button>
                        <span
                          className="px-2.5 py-1 rounded-xl text-xs font-bold"
                          style={{
                            backgroundColor: draftColors.secondary + '30',
                            color: draftColors.secondary,
                          }}
                        >
                          Tag Badge
                        </span>
                      </div>
                    </div>

                    {/* Inputs Demo */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Form Inputs</span>
                      <div
                        className="p-2 rounded-xl border flex items-center justify-between text-xs"
                        style={{
                          backgroundColor: draftColors.surface,
                          borderColor: draftColors.accent + '60',
                        }}
                      >
                        <span style={{ color: getContrastingForeground(draftColors.surface) }}>Search deliverables...</span>
                        <div
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: draftColors.primary }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'task' && (
                  <div
                    className="p-4 rounded-2xl border space-y-3 shadow-xs"
                    style={{
                      backgroundColor: draftColors.surface,
                      borderColor: draftColors.primary + '40',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{
                          backgroundColor: draftColors.primary + '20',
                          color: draftColors.primary,
                        }}
                      >
                        Feature Task
                      </span>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: draftColors.secondary }}>
                        <Clock className="w-3 h-3" /> Due Tomorrow
                      </span>
                    </div>

                    <div>
                      <h4
                        className="text-sm font-bold tracking-tight"
                        style={{ color: getContrastingForeground(draftColors.surface) }}
                      >
                        Implement Modern Semantic Theming
                      </h4>
                      <p className="text-[11px] opacity-75 mt-0.5" style={{ color: getContrastingForeground(draftColors.surface) }}>
                        Derive responsive CSS tokens from primary and secondary foundations.
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span style={{ color: draftColors.primary }}>Progress</span>
                        <span style={{ color: draftColors.primary }}>75%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full overflow-hidden bg-black/20">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: '75%',
                            backgroundColor: draftColors.primary,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'stats' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div
                      className="p-3 rounded-2xl border space-y-1"
                      style={{
                        backgroundColor: draftColors.surface,
                        borderColor: draftColors.primary + '35',
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase opacity-70" style={{ color: getContrastingForeground(draftColors.surface) }}>
                        Active Tasks
                      </span>
                      <div className="text-xl font-extrabold" style={{ color: draftColors.primary }}>
                        24
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-2xl border space-y-1"
                      style={{
                        backgroundColor: draftColors.surface,
                        borderColor: draftColors.accent + '35',
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase opacity-70" style={{ color: getContrastingForeground(draftColors.surface) }}>
                        Sprint Velocity
                      </span>
                      <div className="text-xl font-extrabold" style={{ color: draftColors.accent }}>
                        94%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border border-border bg-card/80 hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: draftColors.primary,
                  color: getContrastingForeground(draftColors.primary),
                }}
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving Theme...' : 'Save Theme'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
