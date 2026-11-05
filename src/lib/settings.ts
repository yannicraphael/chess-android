import { createStore } from './store'

export const PIECE_SETS = [
  { id: 'staunty', name: 'Staunty' },
  { id: 'cooke', name: 'Cooke' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'celtic', name: 'Keltisch' },
  { id: 'dubrovny', name: 'Dubrovny' },
  { id: 'mpchess', name: 'Klar' },
  { id: 'rhosgfx', name: 'Rhos' },
  { id: 'papercut', name: 'Papier' },
] as const

// Piece colours are applied as CSS filters, so they work with every piece set
export const WHITE_COLORS = [
  { id: 'original', name: 'Original', swatch: '#f4f1ea', filter: 'none' },
  { id: 'white', name: 'Weiß', swatch: '#ffffff', filter: 'grayscale(1) brightness(1.12)' },
  { id: 'ivory', name: 'Elfenbein', swatch: '#f3e6c4', filter: 'sepia(.45) brightness(.97)' },
  { id: 'maple', name: 'Ahorn', swatch: '#ead29c', filter: 'sepia(.9) saturate(1.4) brightness(.93)' },
  { id: 'gold', name: 'Gold', swatch: '#f0d050', filter: 'sepia(1) saturate(3) hue-rotate(-8deg) brightness(.95)' },
  { id: 'silver', name: 'Silber', swatch: '#c9cdd2', filter: 'grayscale(1) brightness(.88) contrast(1.1)' },
  { id: 'ice', name: 'Eisblau', swatch: '#cfe8ff', filter: 'sepia(1) saturate(2) hue-rotate(170deg) brightness(1)' },
] as const

export const BLACK_COLORS = [
  { id: 'original', name: 'Original', swatch: '#3b3936', filter: 'none' },
  { id: 'black', name: 'Schwarz', swatch: '#222222', filter: 'grayscale(1) brightness(.55)' },
  { id: 'walnut', name: 'Walnuss', swatch: '#6b4526', filter: 'invert(.32) sepia(1) saturate(2.2) hue-rotate(-15deg) brightness(.62)' },
  { id: 'blue', name: 'Blau', swatch: '#2f5fae', filter: 'invert(.32) sepia(1) saturate(4) hue-rotate(178deg) brightness(.7)' },
  { id: 'red', name: 'Rot', swatch: '#b23a3a', filter: 'invert(.32) sepia(1) saturate(5) hue-rotate(-48deg) brightness(.7)' },
  { id: 'green', name: 'Grün', swatch: '#2e7a32', filter: 'invert(.32) sepia(1) saturate(3) hue-rotate(68deg) brightness(.62)' },
  { id: 'purple', name: 'Lila', swatch: '#7a4bb0', filter: 'invert(.32) sepia(1) saturate(3) hue-rotate(228deg) brightness(.7)' },
] as const

// Procedural wood grain (SVG noise), so no image files are needed
function woodTexture(base: string, grain: [number, number, number], seed: number, strength = 0.55) {
  const [r, g, b] = grain
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>` +
    `<filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.003 0.075' numOctaves='3' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${strength * 2.4} 0 0 0 -${strength * 0.9}'/></filter>` +
    `<rect width='300' height='300' fill='${base}'/><rect width='300' height='300' filter='url(#f)'/></svg>`
  return `url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23')}")`
}

function marbleTexture(base: string, vein: [number, number, number], seed: number) {
  const [r, g, b] = vein
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>` +
    `<filter id='f'><feTurbulence type='turbulence' baseFrequency='0.012' numOctaves='4' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} -2.2 0 0 0 0.9'/></filter>` +
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
  {
    id: 'darkwood', name: 'Dunkles Holz', light: '#c79f6e', dark: '#6e4529', hlLight: '#e3c860', hlDark: '#a88a2c',
    texture: { light: woodTexture('#caa274', [0.55, 0.38, 0.2], 11), dark: woodTexture('#6f472b', [0.28, 0.15, 0.07], 13, 0.65) },
  },
  {
    id: 'marble', name: 'Marmor', light: '#e9e6e1', dark: '#8d8a86', hlLight: '#efe48a', hlDark: '#bdb260',
    texture: { light: marbleTexture('#ece9e4', [0.6, 0.6, 0.62], 5), dark: marbleTexture('#8f8c88', [0.35, 0.34, 0.33], 9) },
  },
  { id: 'green', name: 'Grün', light: '#ebecd0', dark: '#739552', hlLight: '#f5f682', hlDark: '#b9ca43' },
  { id: 'wood', name: 'Hell-Holz', light: '#f0d9b5', dark: '#b58863', hlLight: '#f7ec74', hlDark: '#dac34b' },
  { id: 'blue', name: 'Blau', light: '#dee3e6', dark: '#7d98ad', hlLight: '#c3d888', hlDark: '#92b166' },
  { id: 'stone', name: 'Stein', light: '#d9d9d9', dark: '#8a8f94', hlLight: '#e9e17a', hlDark: '#b8b052' },
  { id: 'purple', name: 'Lila', light: '#e7dff0', dark: '#8f78b0', hlLight: '#f3e98a', hlDark: '#c4b25a' },
  { id: 'coral', name: 'Koralle', light: '#f3e1d4', dark: '#d1826b', hlLight: '#f6e27a', hlDark: '#d9b24e' },
  { id: 'teal', name: 'Türkis', light: '#dcefe9', dark: '#4f9a8f', hlLight: '#e8ee86', hlDark: '#9fbf52' },
  { id: 'sand', name: 'Sand', light: '#f2e8d2', dark: '#c8ad7f', hlLight: '#f6e57c', hlDark: '#d7c057' },
  { id: 'night', name: 'Nacht', light: '#8c97a6', dark: '#4b5563', hlLight: '#b7c06a', hlDark: '#8a9440' },
  { id: 'rose', name: 'Rosé', light: '#f6e4e8', dark: '#c98b9b', hlLight: '#f6e27a', hlDark: '#d9b24e' },
]

export interface Settings {
  pieceSet: string
  whiteColor: string
  blackColor: string
  boardTheme: string
  sound: boolean
  soundSet: string
  vibration: boolean
  coordinates: boolean
  animation: boolean
  coach: boolean // warn about blunders during games
}

export const settings = createStore<Settings>('settings', {
  pieceSet: 'staunty',
  whiteColor: 'original',
  blackColor: 'original',
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
  if (!PIECE_SETS.some((p) => p.id === set)) set = PIECE_SETS[0].id
  return `${import.meta.env.BASE_URL}pieces/${set}/${color}${type.toUpperCase()}.svg`
}

// Applies the chosen piece colours as CSS variables (used by index.css)
function applyPieceColors() {
  const s = settings.get()
  const w = WHITE_COLORS.find((c) => c.id === s.whiteColor) ?? WHITE_COLORS[0]
  const b = BLACK_COLORS.find((c) => c.id === s.blackColor) ?? BLACK_COLORS[0]
  document.documentElement.style.setProperty('--w-filter', w.filter)
  document.documentElement.style.setProperty('--b-filter', b.filter)
}
applyPieceColors()
settings.subscribe(applyPieceColors)
