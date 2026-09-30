'use client'

import React, { useState } from 'react'
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Sliders,
  AlertCircle,
  Paintbrush,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react'
import { PREDEFINED_THEMES, DEFAULT_THEME_ID } from '@/lib/theme/definitions'
import { PresetThemeId, ThemeId, CustomThemeColors } from '@/lib/theme/types'
import { useTaskFlowTheme } from '@/lib/theme/theme-context'
import { CustomThemeEditorModal } from './CustomThemeEditorModal'
import { useTheme as useNextTheme } from 'next-themes'

interface ThemeSettingsViewProps {
  onShowToast?: (msg: string) => void
}

export function ThemeSettingsView({ onShowToast }: ThemeSettingsViewProps) {
  const {
    themeId,
    themeType,
    customTheme,
    setThemePreference,
    resetTheme,
    isSaving,
    saveError,
  } = useTaskFlowTheme()

  const { theme: mode, setTheme: setMode } = useNextTheme()

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
  const [editingPresetBase, setEditingPresetBase] = useState<ThemeId | undefined>(undefined)

  const handleSelectPreset = async (presetId: PresetThemeId) => {
    if (presetId === themeId && themeType === 'PRESET') return
    await setThemePreference(presetId, 'PRESET', null)
  }

  const handleReset = async () => {
    await resetTheme()
  }

  const handleOpenCustomEditor = (baseId?: ThemeId) => {
    setEditingPresetBase(baseId || themeId)
    setIsCustomModalOpen(true)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toast / Error Banner */}
      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-md p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Palette className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              Appearance &amp; Theme
            </h2>
          </div>
          <p className="text-[11px] text-muted-foreground max-w-xl">
            Personalize how TaskFlow looks for you. Preferences sync automatically across all your devices.
          </p>
        </div>

        {/* Mode Selector (Light, Dark, System) */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 border border-border/60 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('light')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'light' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> Light
          </button>
          <button
            type="button"
            onClick={() => setMode('dark')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'dark' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Moon className="w-3.5 h-3.5" /> Dark
          </button>
          <button
            type="button"
            onClick={() => setMode('system')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'system' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" /> System
          </button>
        </div>
      </div>

      {/* 10 Predefined Themes Section */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Choose a Color Palette</h3>
            <p className="text-[11px] text-muted-foreground">
              Select one of the 10 curated TaskFlow palettes. Neutral is the default theme for all new users.
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={isSaving || (themeId === DEFAULT_THEME_ID && themeType === 'PRESET')}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3" /> Reset to Neutral
          </button>
        </div>

        {/* 10 Themes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {PREDEFINED_THEMES.map((preset) => {
            const isSelected = themeType === 'PRESET' && themeId === preset.id
            const isDefault = preset.id === DEFAULT_THEME_ID

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`relative rounded-xl p-2.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 bg-card shadow-sm scale-[1.01]'
                    : 'border-border/70 hover:border-border hover:bg-card/70 bg-card/40'
                }`}
              >
                {/* Active Indicator Checkmark */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {preset.name}
                    </span>
                    {isDefault && (
                      <span className="text-[8px] uppercase font-bold tracking-wider px-1 py-0.2 rounded-full bg-muted text-muted-foreground border border-border/50 shrink-0">
                        Default
                      </span>
                    )}
                  </div>

                  {isSelected ? (
                    <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border/60 group-hover:border-primary/50 transition-colors shrink-0" />
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground mb-2 leading-tight truncate">{preset.description}</p>

                {/* 5 Swatches */}
                <div className="pt-1.5 border-t border-border/40 flex items-center gap-1">
                  {preset.palette.map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border border-black/15 dark:border-white/15 shadow-2xs shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: color }}
                      title={`Color ${i + 1}: ${color}`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Custom Theme Section */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Custom Theme Studio</h3>
              {themeType === 'CUSTOM' && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground max-w-xl">
              Design a tailored color scheme for your personal workflow with real-time interactive preview.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenCustomEditor(themeId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-95 cursor-pointer"
            >
              <Paintbrush className="w-3 h-3" />
              <span>{themeType === 'CUSTOM' ? 'Edit Custom Colors' : 'Customize Theme'}</span>
            </button>
          </div>
        </div>

        {/* If Custom Theme is currently active, show its active colors strip */}
        {themeType === 'CUSTOM' && customTheme && (
          <div className="p-4 rounded-2xl bg-background/60 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {[
                  { label: 'Primary', val: customTheme.primary },
                  { label: 'Secondary', val: customTheme.secondary },
                  { label: 'Accent', val: customTheme.accent },
                  { label: 'Surface', val: customTheme.surface },
                  { label: 'Background', val: customTheme.background },
                ].map(({ label, val }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div
                      className="w-6 h-6 rounded-xl border border-border shadow-xs"
                      style={{ backgroundColor: val }}
                      title={`${label}: ${val}`}
                    />
                    <span className="text-[9px] font-mono text-muted-foreground">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCustomEditor()}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Adjust Colors
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Theme Editor Modal */}
      <CustomThemeEditorModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        initialColors={customTheme}
        basePresetId={editingPresetBase}
        onSaved={() => {
          if (onShowToast) onShowToast('Custom theme saved and applied successfully!')
        }}
      />
    </div>
  )
}
