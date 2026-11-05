import { createStore } from './store'

export const PIECE_SETS = [
  { id: 'gioco', name: 'Gioco' },
  { id: 'staunty', name: 'Staunty' },
  { id: 'maestro', name: 'Maestro' },
  { id: 'cardinal', name: 'Kardinal' },
  { id: 'fresca', name: 'Fresca' },
  { id: 'merida', name: 'Merida' },
  { id: 'cburnett', name: 'Klassisch' },
] as const

// Procedural wood grain (SVG noise), so no image files are needed
function woodTexture(base: string, grain: [number, number, number], seed: number, strength = 0.55) {
  const [r, g, b] = grain
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>` +
    `<filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.003 0.075' numOctaves='3' seed='${seed}'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${strength * 2.4} 0 0 0 -${strength * 0.9}'/></filter>` +
    `<rect width='300' height='300' fill='${base}'/><rect width='300' height='300' filter='url(#f)'/></svg>`
  return `url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23')}")`
}

export interface BoardTheme {
  id: string
  name: string
  light: string
  dark: string
  hlLight: string
  hlDark: string
  texture?: { light: string; dark: string }
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'walnut', name: 'Holz', light: '#e2c08d', dark: '#a8703f', hlLight: '#f0dc72', hlDark: '#c9a83c',
    texture: { light: woodTexture('#e8cc9c', [0.72, 0.53, 0.3], 3), dark: woodTexture('#a8713f', [0.42, 0.24, 0.1], 7, 0.65) },
  },
  { id: 'green', name: 'Grün', light: '#ebecd0', dark: '#739552', hlLight: '#f5f682', hlDark: '#b9ca43' },
  { id: 'wood', name: 'Hell-Holz', light: '#f0d9b5', dark: '#b58863', hlLight: '#f7ec74', hlDark: '#dac34b' },
  { id: 'blue', name: 'Blau', light: '#dee3e6', dark: '#7d98ad', hlLight: '#c3d888', hlDark: '#92b166' },
  { id: 'stone', name: 'Stein', light: '#d9d9d9', dark: '#8a8f94', hlLight: '#e9e17a', hlDark: '#b8b052' },
  { id: 'purple', name: 'Lila', light: '#e7dff0', dark: '#8f78b0', hlLight: '#f3e98a', hlDark: '#c4b25a' },
]

export interface Settings {
  pieceSet: string
  boardTheme: string
  sound: boolean
  soundSet: string
  vibration: boolean
  coordinates: boolean
  animation: boolean
  coach: boolean // warn about blunders during games
}

export const settings = createStore<Settings>('settings', {
  pieceSet: 'gioco',
  boardTheme: 'walnut',
  sound: true,
  soundSet: 'clack',
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
