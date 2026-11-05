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
  { id: 'governor', name: 'Governor' },
  { id: 'tatiana', name: 'Tatiana' },
  { id: 'cardinal', name: 'Cardinal' },
  { id: 'fresca', name: 'Fresca' },
  { id: 'spatial', name: 'Spatial' },
] as const

// Piece colours: only realistic tones (white, black and natural woods). Every filter starts with
// grayscale so that coloured originals (blue, red, orange sets) become neutral first.
export const WHITE_COLORS = [
  { id: 'weiss', name: 'Weiß', swatch: '#f6f4f0', filter: 'grayscale(1) brightness(1.08)' },
  { id: 'elfenbein', name: 'Elfenbein', swatch: '#f1e6cc', filter: 'grayscale(1) sepia(.35) brightness(1.03)' },
  { id: 'ahorn', name: 'Ahorn', swatch: '#ead8b0', filter: 'grayscale(1) sepia(.6) saturate(1.1) hue-rotate(-6deg) brightness(.98)' },
  { id: 'buchs', name: 'Buchsbaum', swatch: '#e2c68c', filter: 'grayscale(1) sepia(.8) saturate(1.15) hue-rotate(-8deg) brightness(.95)' },
  { id: 'esche', name: 'Esche', swatch: '#d4b88a', filter: 'grayscale(1) sepia(.85) saturate(.95) hue-rotate(-10deg) brightness(.9)' },
]

export const BLACK_COLORS = [
  { id: 'schwarz', name: 'Schwarz', swatch: '#2a2a2a', filter: 'grayscale(1) brightness(.7)' },
  { id: 'ebenholz', name: 'Ebenholz', swatch: '#32261f', filter: 'grayscale(1) invert(.12) sepia(.7) brightness(.62)' },
  { id: 'wenge', name: 'Wenge', swatch: '#46352a', filter: 'grayscale(1) invert(.25) sepia(1) saturate(.8) brightness(.5)' },
  { id: 'nussbaum', name: 'Nussbaum', swatch: '#5e3f28', filter: 'grayscale(1) invert(.32) sepia(1) saturate(1.5) hue-rotate(-8deg) brightness(.6)' },
  { id: 'palisander', name: 'Palisander', swatch: '#5a2b22', filter: 'grayscale(1) invert(.3) sepia(1) saturate(2.3) hue-rotate(-28deg) brightness(.5)' },
  { id: 'mahagoni', name: 'Mahagoni', swatch: '#7a3c26', filter: 'grayscale(1) invert(.34) sepia(1) saturate(2.4) hue-rotate(-22deg) brightness(.66)' },
]

// Boards: photos of real wood (see public/boards/CREDITS.txt). Colours are the average square colours (for coordinates).
export interface BoardTheme {
  id: string
  name: string
  light: string
  dark: string
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'ahorn-nuss', name: 'Ahorn & Nussbaum', light: '#c3a36f', dark: '#7e5532' },
  { id: 'birke-kirsche', name: 'Birke & Kirsche', light: '#e0c59d', dark: '#ab765b' },
  { id: 'buche-mahagoni', name: 'Buche & Mahagoni', light: '#dfbd91', dark: '#b87642' },
  { id: 'wurzelholz', name: 'Wurzelholz', light: '#d7a258', dark: '#955120' },
  { id: 'ahorn-wenge', name: 'Ahorn & Wenge', light: '#e4cc9f', dark: '#4d3729' },
  { id: 'esche-eiche', name: 'Esche & Eiche', light: '#ddc59d', dark: '#836141' },
  { id: 'buchs-palisander', name: 'Buchsbaum & Palisander', light: '#ead3a5', dark: '#673729' },
  { id: 'turnier', name: 'Turnierbrett', light: '#edd6af', dark: '#af7f57' },
  { id: 'ahorn-kirsche', name: 'Ahorn & Kirsche', light: '#f0ddb9', dark: '#a35d3b' },
]

export const boardUrl = (id: string) => `${import.meta.env.BASE_URL}boards/${id}.jpg`

// App designs that can be switched in the profile
export const DESIGNS = [
  { id: 'klubhaus', name: 'Klubhaus', desc: 'Nussbaum und Messing', swatch: ['#1b1612', '#c99a52'] },
  { id: 'arena', name: 'Arena', desc: 'Graphit und Grün', swatch: ['#121417', '#7cc04b'] },
  { id: 'studio', name: 'Studio', desc: 'Hell mit Tannengrün', swatch: ['#efece7', '#1f5a43'] },
] as const
export type DesignId = (typeof DESIGNS)[number]['id']

export interface Settings {
  pieceSet: string
  whiteColor: string
  blackColor: string
  boardTheme: string
  design: DesignId
  sound: boolean
  soundSet: string
  vibration: boolean
  coordinates: boolean
  animation: boolean
  animSpeed: 'schnell' | 'normal' | 'langsam'
  coach: boolean // warn about blunders during games
  name: string
  onboarded: boolean
}

export const settings = createStore<Settings>('settings', {
  pieceSet: 'staunty',
  whiteColor: 'elfenbein',
  blackColor: 'ebenholz',
  boardTheme: 'ahorn-nuss',
  design: 'klubhaus',
  sound: true,
  soundSet: 'turnier',
  vibration: true,
  coordinates: true,
  animation: true,
  animSpeed: 'normal',
  coach: true,
  name: 'Yannic',
  onboarded: false,
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
  const root = document.documentElement
  root.dataset.design = DESIGNS.some((d) => d.id === s.design) ? s.design : 'klubhaus'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#1b1612')
  const w = WHITE_COLORS.find((c) => c.id === s.whiteColor) ?? WHITE_COLORS[0]
  const b = BLACK_COLORS.find((c) => c.id === s.blackColor) ?? BLACK_COLORS[0]
  document.documentElement.style.setProperty('--w-filter', w.filter)
  document.documentElement.style.setProperty('--b-filter', b.filter)
}
applyPieceColors()
settings.subscribe(applyPieceColors)
