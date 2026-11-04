import { createStore } from './store'

export const PIECE_SETS = [
  { id: 'maestro', name: 'Maestro' },
  { id: 'cardinal', name: 'Kardinal' },
  { id: 'fresca', name: 'Fresca' },
  { id: 'merida', name: 'Merida' },
  { id: 'cburnett', name: 'Klassisch' },
] as const

export const BOARD_THEMES = [
  { id: 'green', name: 'Grün', light: '#ebecd0', dark: '#739552', hlLight: '#f5f682', hlDark: '#b9ca43' },
  { id: 'wood', name: 'Holz', light: '#f0d9b5', dark: '#b58863', hlLight: '#f7ec74', hlDark: '#dac34b' },
  { id: 'blue', name: 'Blau', light: '#dee3e6', dark: '#7d98ad', hlLight: '#c3d888', hlDark: '#92b166' },
  { id: 'stone', name: 'Stein', light: '#d9d9d9', dark: '#8a8f94', hlLight: '#e9e17a', hlDark: '#b8b052' },
  { id: 'purple', name: 'Lila', light: '#e7dff0', dark: '#8f78b0', hlLight: '#f3e98a', hlDark: '#c4b25a' },
] as const

export interface Settings {
  pieceSet: string
  boardTheme: string
  sound: boolean
  vibration: boolean
  coordinates: boolean
  animation: boolean
  coach: boolean // warn about blunders during games
}

export const settings = createStore<Settings>('settings', {
  pieceSet: 'maestro',
  boardTheme: 'green',
  sound: true,
  vibration: true,
  coordinates: true,
  animation: true,
  coach: true,
})

export function boardTheme(id: string) {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0]
}

export function pieceUrl(color: 'w' | 'b', type: string, set = settings.get().pieceSet) {
  return `${import.meta.env.BASE_URL}pieces/${set}/${color}${type.toUpperCase()}.svg`
}
