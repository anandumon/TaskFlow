import { ThemeId, ThemeType, CustomThemeColors, ThemeCssVariables } from './types'
import { PRESET_THEME_MAP, DEFAULT_THEME_ID } from './definitions'
import { hexToRgb, getLuminance, getContrastingForeground, sanitizeHexColor } from './validator'

export interface HslColor {
  h: number
  s: number
  l: number
}

/**
 * Converts Hex to HSL color object
 */
export function hexToHsl(hex: string): HslColor {
  const { r, g, b } = hexToRgb(hex)
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255

  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0)
        break
      case gf:
        h = (bf - rf) / d + 2
        break
      case bf:
        h = (rf - gf) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Converts Hex to HSL string compatible with shadcn CSS variables: "h s% l%"
 */
export function hexToHslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex)
  return `${h} ${s}% ${l}%`
}

/**
 * Custom HSL format helper
 */
function hslStr(h: number, s: number, l: number): string {
  const clampedH = Math.round(((h % 360) + 360) % 360)
  const clampedS = Math.max(0, Math.min(100, Math.round(s)))
  const clampedL = Math.max(0, Math.min(100, Math.round(l)))
  return `${clampedH} ${clampedS}% ${clampedL}%`
}

/**
 * Generates all semantic CSS variables for the given theme and mode
 */
export function generateThemeCssVariables(
  themeId: ThemeId,
  themeType: ThemeType,
  customTheme: CustomThemeColors | null,
  isDark: boolean
): ThemeCssVariables {
  if (themeType === 'CUSTOM' && customTheme) {
    return generateCustomThemeVariables(customTheme, isDark)
  }

  const preset = PRESET_THEME_MAP[themeId as keyof typeof PRESET_THEME_MAP] || PRESET_THEME_MAP[DEFAULT_THEME_ID]
  return generatePresetThemeVariables(preset.palette, isDark, themeId)
}

function generatePresetThemeVariables(
  palette: readonly [string, string, string, string, string],
  isDark: boolean,
  themeId: string
): ThemeCssVariables {
  const [c1, c2, c3, c4, c5] = palette
  const hsl1 = hexToHsl(c1)
  const hsl2 = hexToHsl(c2)
  const hsl3 = hexToHsl(c3)
  const hsl4 = hexToHsl(c4)
  const hsl5 = hexToHsl(c5)

  // Chart tokens map directly to the 5 palette colors
  const chart1 = hexToHslString(c1)
  const chart2 = hexToHslString(c2)
  const chart3 = hexToHslString(c3)
  const chart4 = hexToHslString(c4)
  const chart5 = hexToHslString(c5)

  if (isDark) {
    // Determine the vibrant accent color for dark mode (the color with the highest/most pleasant mid-luminance)
    let primaryHex = c3
    if (themeId === 'DUSK') primaryHex = c4 // Coral #F08A8A
    else if (themeId === 'OCEAN') primaryHex = c3 // Cyan #29ADB2
    else if (themeId === 'SAGE') primaryHex = c3 // Mint #A3C9A8
    else if (themeId === 'SUNSET') primaryHex = c2 // Orange #F9844A
    else if (themeId === 'LAVENDER') primaryHex = c2 // Violet #7D6CC4
    else if (themeId === 'MUSTARD') primaryHex = c3 // Honey #F0C94C
    else if (themeId === 'TEAL_GRAY') primaryHex = c3 // Teal #80CBC4
    else if (themeId === 'BERRY') primaryHex = c3 // Strawberry #E3356A
    else if (themeId === 'ARCTIC') primaryHex = c3 // Sky #64B5F6
    else if (themeId === 'NEUTRAL') primaryHex = c3 // Ash silver #BDBDBD

    const primaryHsl = hexToHsl(primaryHex)
    const primaryFgHex = getContrastingForeground(primaryHex)
    const primaryFgHsl = hexToHslString(primaryFgHex)

    // Base background: Deep onyx with a very subtle tint of the primary palette hue
    const bgHue = hsl1.h
    const bgSat = Math.min(18, hsl1.s)
    const bgHsl = hslStr(bgHue, bgSat, 4) // 4% lightness
    const cardHsl = hslStr(bgHue, bgSat + 2, 7.5) // 7.5% lightness
    const popoverHsl = hslStr(bgHue, bgSat + 2, 8)
    const borderHsl = hslStr(bgHue, bgSat, 16)
    const inputHsl = hslStr(bgHue, bgSat, 16)
    const mutedHsl = hslStr(bgHue, bgSat, 12)
    const mutedFgHsl = hslStr(primaryHsl.h, 15, 68)

    const secondaryHex = c2
    const secondaryHsl = hexToHsl(secondaryHex)
    const secondaryFgHex = getContrastingForeground(secondaryHex)

    const accentHsl = hslStr(bgHue, bgSat + 4, 13)
    const ringHsl = hexToHslString(primaryHex)

    return {
      '--background': bgHsl,
      '--foreground': '0 0% 98%',
      '--card': cardHsl,
      '--card-foreground': '0 0% 98%',
      '--popover': popoverHsl,
      '--popover-foreground': '0 0% 98%',
      '--primary': hexToHslString(primaryHex),
      '--primary-foreground': primaryFgHsl,
      '--secondary': hslStr(secondaryHsl.h, secondaryHsl.s * 0.4, 22),
      '--secondary-foreground': '0 0% 95%',
      '--muted': mutedHsl,
      '--muted-foreground': mutedFgHsl,
      '--accent': accentHsl,
      '--accent-foreground': '0 0% 100%',
      '--border': borderHsl,
      '--input': inputHsl,
      '--ring': ringHsl,
      '--sidebar': hslStr(bgHue, bgSat, 3.5),
      '--sidebar-foreground': '0 0% 92%',
      '--sidebar-accent': hslStr(bgHue, bgSat + 3, 10),
      '--sidebar-primary': hexToHslString(primaryHex),
      '--sidebar-primary-foreground': primaryFgHsl,
      '--sidebar-border': borderHsl,
      '--chart-1': chart1,
      '--chart-2': chart2,
      '--chart-3': chart3,
      '--chart-4': chart4,
      '--chart-5': chart5,
    }
  } else {
    // Light Mode
    let primaryHex = c2
    if (themeId === 'DUSK') primaryHex = c3 // Violet #6D5BA6
    else if (themeId === 'OCEAN') primaryHex = c2 // Deep Marine #1B4965
    else if (themeId === 'SAGE') primaryHex = c1 // Deep Forest #2E4D3D
    else if (themeId === 'SUNSET') primaryHex = c1 // Crimson #E94F37
    else if (themeId === 'LAVENDER') primaryHex = c1 // Royal Violet #5E4B8B
    else if (themeId === 'MUSTARD') primaryHex = c2 // Mustard Gold #D4A017
    else if (themeId === 'TEAL_GRAY') primaryHex = c2 // Steel Gray #455A64
    else if (themeId === 'BERRY') primaryHex = c2 // Magenta Ruby #9D174D
    else if (themeId === 'ARCTIC') primaryHex = c2 // Electric Blue #1E88E5
    else if (themeId === 'NEUTRAL') primaryHex = c1 // Dark Slate #333333

    const primaryHsl = hexToHsl(primaryHex)
    const primaryFgHex = getContrastingForeground(primaryHex)
    const primaryFgHsl = hexToHslString(primaryFgHex)

    const bgHue = hsl5.h
    const bgHsl = '0 0% 100%'
    const cardHsl = '0 0% 100%'
    const popoverHsl = '0 0% 100%'
    const borderHsl = hslStr(bgHue, 15, 91)
    const inputHsl = hslStr(bgHue, 15, 91)
    const mutedHsl = hslStr(bgHue, 12, 95)
    const mutedFgHsl = hslStr(primaryHsl.h, 15, 45)

    const accentHsl = hslStr(primaryHsl.h, 25, 95)
    const ringHsl = hexToHslString(primaryHex)

    return {
      '--background': bgHsl,
      '--foreground': '0 0% 9%',
      '--card': cardHsl,
      '--card-foreground': '0 0% 9%',
      '--popover': popoverHsl,
      '--popover-foreground': '0 0% 9%',
      '--primary': hexToHslString(primaryHex),
      '--primary-foreground': primaryFgHsl,
      '--secondary': hslStr(primaryHsl.h, 20, 90),
      '--secondary-foreground': hexToHslString(primaryHex),
      '--muted': mutedHsl,
      '--muted-foreground': mutedFgHsl,
      '--accent': accentHsl,
      '--accent-foreground': hexToHslString(primaryHex),
      '--border': borderHsl,
      '--input': inputHsl,
      '--ring': ringHsl,
      '--sidebar': '0 0% 100%',
      '--sidebar-foreground': '0 0% 12%',
      '--sidebar-accent': hslStr(primaryHsl.h, 15, 96),
      '--sidebar-primary': hexToHslString(primaryHex),
      '--sidebar-primary-foreground': primaryFgHsl,
      '--sidebar-border': borderHsl,
      '--chart-1': chart1,
      '--chart-2': chart2,
      '--chart-3': chart3,
      '--chart-4': chart4,
      '--chart-5': chart5,
    }
  }
}

function generateCustomThemeVariables(
  custom: CustomThemeColors,
  isDark: boolean
): ThemeCssVariables {
  const primHsl = hexToHsl(custom.primary)
  const secHsl = hexToHsl(custom.secondary)
  const accHsl = hexToHsl(custom.accent)
  const surfHsl = hexToHsl(custom.surface)
  const bgHsl = hexToHsl(custom.background)

  const primFg = getContrastingForeground(custom.primary)
  const secFg = getContrastingForeground(custom.secondary)
  const accFg = getContrastingForeground(custom.accent)
  const bgFg = getContrastingForeground(custom.background)
  const surfFg = getContrastingForeground(custom.surface)

  const bgStr = hexToHslString(custom.background)
  const cardStr = hexToHslString(custom.surface)
  const primStr = hexToHslString(custom.primary)
  const secStr = hexToHslString(custom.secondary)
  const accStr = hexToHslString(custom.accent)

  // Derive subtle borders and inputs
  const borderLightness = isDark ? Math.min(30, surfHsl.l + 10) : Math.max(70, surfHsl.l - 12)
  const borderHsl = hslStr(surfHsl.h, Math.max(5, surfHsl.s * 0.5), borderLightness)
  const mutedLightness = isDark ? Math.min(22, surfHsl.l + 6) : Math.max(88, surfHsl.l - 6)
  const mutedHsl = hslStr(surfHsl.h, Math.max(5, surfHsl.s * 0.4), mutedLightness)

  return {
    '--background': bgStr,
    '--foreground': hexToHslString(bgFg),
    '--card': cardStr,
    '--card-foreground': hexToHslString(surfFg),
    '--popover': cardStr,
    '--popover-foreground': hexToHslString(surfFg),
    '--primary': primStr,
    '--primary-foreground': hexToHslString(primFg),
    '--secondary': secStr,
    '--secondary-foreground': hexToHslString(secFg),
    '--muted': mutedHsl,
    '--muted-foreground': hslStr(surfHsl.h, 15, isDark ? 65 : 42),
    '--accent': accStr,
    '--accent-foreground': hexToHslString(accFg),
    '--border': borderHsl,
    '--input': borderHsl,
    '--ring': primStr,
    '--sidebar': bgStr,
    '--sidebar-foreground': hexToHslString(bgFg),
    '--sidebar-accent': mutedHsl,
    '--sidebar-primary': primStr,
    '--sidebar-primary-foreground': hexToHslString(primFg),
    '--sidebar-border': borderHsl,
    '--chart-1': primStr,
    '--chart-2': secStr,
    '--chart-3': accStr,
    '--chart-4': hslStr((primHsl.h + 60) % 360, 75, 55),
    '--chart-5': hslStr((primHsl.h + 180) % 360, 75, 55),
  }
}
