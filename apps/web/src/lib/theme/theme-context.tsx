'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme as useNextTheme } from 'next-themes'
import { useAuthStore } from '@/stores/auth-store'
import { ThemeId, ThemeType, CustomThemeColors, UserThemePreference } from './types'
import { DEFAULT_THEME_ID, PRESET_THEME_MAP, isPresetThemeId } from './definitions'
import { generateThemeCssVariables } from './generator'

interface ThemePreviewState {
  themeId: ThemeId
  themeType: ThemeType
  customTheme?: CustomThemeColors | null
}

interface TaskFlowThemeContextValue {
  themeId: ThemeId
  themeType: ThemeType
  customTheme: CustomThemeColors | null
  previewTheme: ThemePreviewState | null
  isDark: boolean
  isLoading: boolean
  isSaving: boolean
  saveError: string | null
  setThemePreference: (themeId: ThemeId, themeType?: ThemeType, customTheme?: CustomThemeColors | null) => Promise<boolean>
  setPreviewTheme: (preview: ThemePreviewState | null) => void
  clearPreview: () => void
  resetTheme: () => Promise<boolean>
}

const TaskFlowThemeContext = createContext<TaskFlowThemeContextValue | null>(null)

const LOCAL_STORAGE_THEME_KEY = 'taskflow_cached_theme_pref'

function getInitialCachedTheme(): { themeId: ThemeId; themeType: ThemeType; customTheme: CustomThemeColors | null } {
  if (typeof window === 'undefined') {
    return { themeId: DEFAULT_THEME_ID, themeType: 'PRESET', customTheme: null }
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_THEME_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.themeId) {
        return {
          themeId: parsed.themeId,
          themeType: parsed.themeType || 'PRESET',
          customTheme: parsed.customTheme || null,
        }
      }
    }
  } catch {}
  return { themeId: DEFAULT_THEME_ID, themeType: 'PRESET', customTheme: null }
}

export function TaskFlowThemeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { resolvedTheme, theme: modeTheme } = useNextTheme()
  const user = useAuthStore((s) => s.user)

  const isDark = resolvedTheme === 'dark' || (!resolvedTheme && modeTheme === 'dark')

  // Initial state from local storage cache for 0ms initial flicker
  const [cached] = useState(getInitialCachedTheme)
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(cached.themeId)
  const [activeThemeType, setActiveThemeType] = useState<ThemeType>(cached.themeType)
  const [activeCustomTheme, setActiveCustomTheme] = useState<CustomThemeColors | null>(cached.customTheme)

  // Live draft preview state
  const [previewTheme, setPreviewTheme] = useState<ThemePreviewState | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Query server preference (Authoritative source of truth)
  const { data: serverTheme, isLoading } = useQuery<UserThemePreference>({
    queryKey: ['me', 'theme', user?.id || 'anon'],
    queryFn: async () => {
      const res = await fetch('/api/v1/me/theme')
      if (!res.ok) {
        throw new Error('Failed to fetch theme preference')
      }
      const json = await res.json()
      return json.data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // Sync server preference when loaded
  useEffect(() => {
    if (serverTheme && serverTheme.themeId) {
      setActiveThemeId(serverTheme.themeId)
      setActiveThemeType(serverTheme.themeType || 'PRESET')
      setActiveCustomTheme(serverTheme.customTheme || null)

      // Sync local storage cache
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_THEME_KEY,
            JSON.stringify({
              themeId: serverTheme.themeId,
              themeType: serverTheme.themeType,
              customTheme: serverTheme.customTheme,
            })
          )
        } catch {}
      }
    }
  }, [serverTheme])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      themeId,
      themeType,
      customTheme,
    }: {
      themeId: ThemeId
      themeType: ThemeType
      customTheme?: CustomThemeColors | null
    }) => {
      const res = await fetch('/api/v1/me/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId,
          themeType,
          customTheme: themeType === 'CUSTOM' ? customTheme : null,
        }),
      })
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson?.error?.message || 'Failed to save theme preference')
      }
      const json = await res.json()
      return json.data as UserThemePreference
    },
    onSuccess: (savedData) => {
      setSaveError(null)
      queryClient.setQueryData(['me', 'theme', user?.id || 'anon'], savedData)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_THEME_KEY,
            JSON.stringify({
              themeId: savedData.themeId,
              themeType: savedData.themeType,
              customTheme: savedData.customTheme,
            })
          )
        } catch {}
      }
    },
  })

  // Reset Mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/me/theme/reset', { method: 'POST' })
      if (!res.ok) {
        throw new Error('Failed to reset theme')
      }
      const json = await res.json()
      return json.data as UserThemePreference
    },
    onSuccess: (resetData) => {
      setSaveError(null)
      setActiveThemeId(resetData.themeId)
      setActiveThemeType(resetData.themeType)
      setActiveCustomTheme(null)
      queryClient.setQueryData(['me', 'theme', user?.id || 'anon'], resetData)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_THEME_KEY,
            JSON.stringify({
              themeId: resetData.themeId,
              themeType: resetData.themeType,
              customTheme: null,
            })
          )
        } catch {}
      }
    },
  })

  // Effective theme to apply (Preview has priority over active)
  const effectiveThemeId = previewTheme?.themeId || activeThemeId
  const effectiveThemeType = previewTheme?.themeType || activeThemeType
  const effectiveCustomTheme = previewTheme !== null ? (previewTheme.customTheme || null) : activeCustomTheme

  // Apply CSS Variables directly to document.documentElement
  useEffect(() => {
    if (typeof document === 'undefined') return

    try {
      const vars = generateThemeCssVariables(
        effectiveThemeId,
        effectiveThemeType,
        effectiveCustomTheme,
        isDark
      )

      const root = document.documentElement
      for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value)
      }
    } catch (err) {
      console.error('[TaskFlowThemeProvider] Error applying theme CSS variables:', err)
    }
  }, [effectiveThemeId, effectiveThemeType, effectiveCustomTheme, isDark])

  // Public setter with optimistic update and rollback
  const setThemePreference = useCallback(
    async (
      newThemeId: ThemeId,
      newThemeType: ThemeType = isPresetThemeId(newThemeId) ? 'PRESET' : 'CUSTOM',
      newCustomTheme: CustomThemeColors | null = null
    ): Promise<boolean> => {
      const prevThemeId = activeThemeId
      const prevThemeType = activeThemeType
      const prevCustomTheme = activeCustomTheme

      // 1. Optimistic update
      setActiveThemeId(newThemeId)
      setActiveThemeType(newThemeType)
      setActiveCustomTheme(newCustomTheme)
      setPreviewTheme(null) // clear any preview

      try {
        await saveMutation.mutateAsync({
          themeId: newThemeId,
          themeType: newThemeType,
          customTheme: newCustomTheme,
        })
        return true
      } catch (err: any) {
        console.error('[TaskFlowThemeProvider] Save failed, rolling back:', err)
        setSaveError(err.message || 'Failed to save theme preference')
        // Rollback
        setActiveThemeId(prevThemeId)
        setActiveThemeType(prevThemeType)
        setActiveCustomTheme(prevCustomTheme)
        return false
      }
    },
    [activeThemeId, activeThemeType, activeCustomTheme, saveMutation]
  )

  const clearPreview = useCallback(() => {
    setPreviewTheme(null)
  }, [])

  const resetTheme = useCallback(async (): Promise<boolean> => {
    const prevThemeId = activeThemeId
    const prevThemeType = activeThemeType
    const prevCustomTheme = activeCustomTheme

    setActiveThemeId(DEFAULT_THEME_ID)
    setActiveThemeType('PRESET')
    setActiveCustomTheme(null)
    setPreviewTheme(null)

    try {
      await resetMutation.mutateAsync()
      return true
    } catch (err: any) {
      console.error('[TaskFlowThemeProvider] Reset failed, rolling back:', err)
      setSaveError(err.message || 'Failed to reset theme')
      setActiveThemeId(prevThemeId)
      setActiveThemeType(prevThemeType)
      setActiveCustomTheme(prevCustomTheme)
      return false
    }
  }, [activeThemeId, activeThemeType, activeCustomTheme, resetMutation])

  const value = useMemo(
    () => ({
      themeId: activeThemeId,
      themeType: activeThemeType,
      customTheme: activeCustomTheme,
      previewTheme,
      isDark,
      isLoading,
      isSaving: saveMutation.isPending || resetMutation.isPending,
      saveError,
      setThemePreference,
      setPreviewTheme,
      clearPreview,
      resetTheme,
    }),
    [
      activeThemeId,
      activeThemeType,
      activeCustomTheme,
      previewTheme,
      isDark,
      isLoading,
      saveMutation.isPending,
      resetMutation.isPending,
      saveError,
      setThemePreference,
      clearPreview,
      resetTheme,
    ]
  )

  return <TaskFlowThemeContext.Provider value={value}>{children}</TaskFlowThemeContext.Provider>
}

export function useTaskFlowTheme(): TaskFlowThemeContextValue {
  const ctx = useContext(TaskFlowThemeContext)
  if (!ctx) {
    throw new Error('useTaskFlowTheme must be used within a TaskFlowThemeProvider')
  }
  return ctx
}
