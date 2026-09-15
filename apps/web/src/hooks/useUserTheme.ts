'use client'

import { useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/stores/auth-store'

export function useUserTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const user = useAuthStore((s) => s.user)

  // Restore user's specific theme whenever user ID changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (user?.id) {
      const userThemeKey = `taskflow_user_theme_${user.id}`
      const savedUserTheme = localStorage.getItem(userThemeKey)
      if (savedUserTheme && (savedUserTheme === 'dark' || savedUserTheme === 'light')) {
        if (theme !== savedUserTheme) {
          setTheme(savedUserTheme)
        }
      } else if (theme) {
        // Initialize user preference with current theme
        localStorage.setItem(userThemeKey, theme)
      }
    }
  }, [user?.id, setTheme, theme])

  const toggleTheme = useCallback(() => {
    const currentMode = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : (resolvedTheme || 'dark')
    const newTheme = currentMode === 'dark' ? 'light' : 'dark'

    setTheme(newTheme)

    if (typeof window !== 'undefined') {
      if (user?.id) {
        localStorage.setItem(`taskflow_user_theme_${user.id}`, newTheme)
      }
      localStorage.setItem('taskflow_latest_theme', newTheme)
      localStorage.setItem('theme', newTheme)
    }
  }, [theme, resolvedTheme, setTheme, user?.id])

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark' || resolvedTheme === 'dark',
  }
}
