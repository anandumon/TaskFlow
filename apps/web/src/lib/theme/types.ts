export type PresetThemeId =
  | 'DUSK'
  | 'SAGE'
  | 'OCEAN'
  | 'SUNSET'
  | 'LAVENDER'
  | 'MUSTARD'
  | 'TEAL_GRAY'
  | 'BERRY'
  | 'ARCTIC'
  | 'NEUTRAL'

export type ThemeId = PresetThemeId | 'CUSTOM'

export type ThemeType = 'PRESET' | 'CUSTOM'

export interface CustomThemeColors {
  primary: string
  secondary: string
  accent: string
  surface: string
  background: string
}

export interface ThemePresetDefinition {
  id: PresetThemeId
  name: string
  description: string
  palette: readonly [string, string, string, string, string]
}

export interface UserThemePreference {
  themeId: ThemeId
  themeType: ThemeType
  customTheme: CustomThemeColors | null
  updatedAt?: string
}

export interface ThemeCssVariables {
  [cssVarName: string]: string
}
