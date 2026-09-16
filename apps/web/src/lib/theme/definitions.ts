import { ThemePresetDefinition, PresetThemeId, ThemeId } from './types'

export const DEFAULT_THEME_ID: PresetThemeId = 'NEUTRAL'

export const PREDEFINED_THEMES: readonly ThemePresetDefinition[] = [
  {
    id: 'DUSK',
    name: 'Dusk',
    description: 'Calm · Warm · Sophisticated',
    palette: ['#1A1B2E', '#42426F', '#6D5BA6', '#F08A8A', '#FFD6C9'],
  },
  {
    id: 'SAGE',
    name: 'Sage',
    description: 'Fresh · Natural · Balanced',
    palette: ['#2E4D3D', '#527F5B', '#A3C9A8', '#DCEAD9', '#F7F7F2'],
  },
  {
    id: 'OCEAN',
    name: 'Ocean',
    description: 'Cool · Clean · Refreshing',
    palette: ['#0D1B2A', '#1B4965', '#29ADB2', '#A8DADC', '#E6F4F1'],
  },
  {
    id: 'SUNSET',
    name: 'Sunset',
    description: 'Vibrant · Energetic · Friendly',
    palette: ['#E94F37', '#F9844A', '#F9C74F', '#FDD9B5', '#FFF2E7'],
  },
  {
    id: 'LAVENDER',
    name: 'Lavender',
    description: 'Soft · Dreamy · Elegant',
    palette: ['#5E4B8B', '#7D6CC4', '#B9A7E0', '#E7D6F7', '#F6F2FB'],
  },
  {
    id: 'MUSTARD',
    name: 'Mustard',
    description: 'Bold · Modern · Playful',
    palette: ['#2B2B2B', '#D4A017', '#F0C94C', '#F7E7B5', '#FFFDF5'],
  },
  {
    id: 'TEAL_GRAY',
    name: 'Teal / Gray',
    description: 'Minimal · Calm · Professional',
    palette: ['#263238', '#455A64', '#80CBC4', '#CFD8DC', '#ECEFF1'],
  },
  {
    id: 'BERRY',
    name: 'Berry',
    description: 'Rich · Bold · Luxurious',
    palette: ['#6B0F3C', '#9D174D', '#E3356A', '#F7A1B3', '#FFE6EC'],
  },
  {
    id: 'ARCTIC',
    name: 'Arctic',
    description: 'Crisp · Cool · Modern',
    palette: ['#102A43', '#1E88E5', '#64B5F6', '#BBDEFB', '#E3F2FD'],
  },
  {
    id: 'NEUTRAL',
    name: 'Neutral',
    description: 'Timeless · Clean · Versatile',
    palette: ['#333333', '#757575', '#BDBDBD', '#EEEEEE', '#FAFAFA'],
  },
] as const

export const PRESET_THEME_MAP: Record<PresetThemeId, ThemePresetDefinition> = PREDEFINED_THEMES.reduce(
  (acc, theme) => {
    acc[theme.id] = theme
    return acc
  },
  {} as Record<PresetThemeId, ThemePresetDefinition>
)

export function isPresetThemeId(id: string): id is PresetThemeId {
  return id in PRESET_THEME_MAP
}

export function isValidThemeId(id: string): id is ThemeId {
  return isPresetThemeId(id) || id === 'CUSTOM'
}
