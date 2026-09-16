import { CustomThemeColors } from './types'

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function isValidHexColor(color: unknown): color is string {
  if (typeof color !== 'string') return false
  const trimmed = color.trim()
  return HEX_COLOR_REGEX.test(trimmed)
}

export function sanitizeHexColor(color: string): string {
  if (!isValidHexColor(color)) {
    throw new Error(`Invalid HEX color format: ${color}`)
  }
  let hex = color.trim().toUpperCase()
  // Expand 3-digit hex to 6-digit
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex
}

export function validateCustomThemeColors(colors: unknown): {
  isValid: boolean
  error?: string
  sanitized?: CustomThemeColors
} {
  if (!colors || typeof colors !== 'object') {
    return { isValid: false, error: 'Custom theme colors must be an object.' }
  }

  const c = colors as Record<string, unknown>
  const requiredKeys: (keyof CustomThemeColors)[] = [
    'primary',
    'secondary',
    'accent',
    'surface',
    'background',
  ]

  for (const key of requiredKeys) {
    if (!c[key] || typeof c[key] !== 'string') {
      return { isValid: false, error: `Missing or invalid required color: '${key}'` }
    }
    if (!isValidHexColor(c[key])) {
      return {
        isValid: false,
        error: `Color '${key}' (${c[key]}) is not a valid HEX code (e.g. #7C3AED or #FFF).`,
      }
    }
  }

  return {
    isValid: true,
    sanitized: {
      primary: sanitizeHexColor(c.primary as string),
      secondary: sanitizeHexColor(c.secondary as string),
      accent: sanitizeHexColor(c.accent as string),
      surface: sanitizeHexColor(c.surface as string),
      background: sanitizeHexColor(c.background as string),
    },
  }
}

/**
 * Parses Hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const sanitized = sanitizeHexColor(hex)
  const num = parseInt(sanitized.slice(1), 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Relative luminance for WCAG contrast calculation
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculates WCAG contrast ratio between two hex colors (1 to 21)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const rgb1 = hexToRgb(hex1)
    const rgb2 = hexToRgb(hex2)
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  } catch {
    return 1
  }
}

/**
 * Returns either '#FFFFFF' or '#000000' to guarantee maximum readable contrast against a background hex
 */
export function getContrastingForeground(bgHex: string): string {
  try {
    const rgb = hexToRgb(bgHex)
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b)
    return luminance > 0.4 ? '#111827' : '#FFFFFF'
  } catch {
    return '#FFFFFF'
  }
}
