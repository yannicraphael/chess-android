import { createStore } from './store'
import { deviceLang, L, type Lang, type Notation } from '../i18n'

export const PIECE_SETS = L([
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
] as const)

// Piece colours: only realistic tones (white, black and natural woods). Every filter starts with
// grayscale so that coloured originals (blue, red, orange sets) become neutral first.
export const WHITE_COLORS = L([
  { id: 'weiss', name: 'Weiß', swatch: '#f6f4f0', filter: 'grayscale(1) brightness(1.08)' },
  { id: 'elfenbein', name: 'Elfenbein', swatch: '#f1e6cc', filter: 'grayscale(1) sepia(.35) brightness(1.03)' },
  { id: 'ahorn', name: 'Ahorn', swatch: '#ead8b0', filter: 'grayscale(1) sepia(.6) saturate(1.1) hue-rotate(-6deg) brightness(.98)' },
  { id: 'buchs', name: 'Buchsbaum', swatch: '#e2c68c', filter: 'grayscale(1) sepia(.8) saturate(1.15) hue-rotate(-8deg) brightness(.95)' },
  { id: 'esche', name: 'Esche', swatch: '#d4b88a', filter: 'grayscale(1) sepia(.85) saturate(.95) hue-rotate(-10deg) brightness(.9)' },
])

export const BLACK_COLORS = L([
  { id: 'schwarz', name: 'Schwarz', swatch: '#2a2a2a', filter: 'grayscale(1) brightness(.7)' },
  { id: 'ebenholz', name: 'Ebenholz', swatch: '#32261f', filter: 'grayscale(1) invert(.12) sepia(.7) brightness(.62)' },
  { id: 'wenge', name: 'Wenge', swatch: '#46352a', filter: 'grayscale(1) invert(.25) sepia(1) saturate(.8) brightness(.5)' },
  { id: 'nussbaum', name: 'Nussbaum', swatch: '#5e3f28', filter: 'grayscale(1) invert(.32) sepia(1) saturate(1.5) hue-rotate(-8deg) brightness(.6)' },
  { id: 'palisander', name: 'Palisander', swatch: '#5a2b22', filter: 'grayscale(1) invert(.3) sepia(1) saturate(2.3) hue-rotate(-28deg) brightness(.5)' },
  { id: 'mahagoni', name: 'Mahagoni', swatch: '#7a3c26', filter: 'grayscale(1) invert(.34) sepia(1) saturate(2.4) hue-rotate(-22deg) brightness(.66)' },
])

// Boards: photos of real wood (see public/boards/CREDITS.txt). Colours are the average square colours (for coordinates).
export interface BoardTheme {
  id: string
  name: string
  light: string
  dark: string
}

export const BOARD_THEMES: BoardTheme[] = L<BoardTheme[]>([
  { id: 'ahorn-nuss', name: 'Ahorn & Nussbaum', light: '#c3a36f', dark: '#7e5532' },
  { id: 'birke-kirsche', name: 'Birke & Kirsche', light: '#e0c59d', dark: '#ab765b' },
  { id: 'buche-mahagoni', name: 'Buche & Mahagoni', light: '#dfbd91', dark: '#b87642' },
  { id: 'wurzelholz', name: 'Wurzelholz', light: '#d7a258', dark: '#955120' },
  { id: 'ahorn-wenge', name: 'Ahorn & Wenge', light: '#e4cc9f', dark: '#4d3729' },
  { id: 'esche-eiche', name: 'Esche & Eiche', light: '#ddc59d', dark: '#836141' },
  { id: 'buchs-palisander', name: 'Buchsbaum & Palisander', light: '#ead3a5', dark: '#673729' },
  { id: 'turnier', name: 'Turnierbrett', light: '#edd6af', dark: '#af7f57' },
  { id: 'ahorn-kirsche', name: 'Ahorn & Kirsche', light: '#f0ddb9', dark: '#a35d3b' },
])

export const boardUrl = (id: string) => `${import.meta.env.BASE_URL}boards/${id}.jpg`

// Moods of the painted Schachland world, switchable in the profile (colours and landscapes)
export const DESIGNS = L([
  { id: 'sommer', name: 'Sommer', desc: 'Hell mit Waldgrün', swatch: ['#f6f2ea', '#2e7a4e'] },
  { id: 'herbst', name: 'Herbst', desc: 'Warmes Holz und Rost', swatch: ['#f5ede2', '#b4532a'] },
  { id: 'nacht', name: 'Nacht', desc: 'Dunkel mit Laternengold', swatch: ['#12151d', '#e3ab45'] },
  { id: 'fruehling', name: 'Frühling', desc: 'Kirschblüten und frisches Grün', swatch: ['#f8f4f0', '#c4577a'] },
  { id: 'winter', name: 'Winter', desc: 'Schnee und Eisblau', swatch: ['#eef2f6', '#2f6690'] },
  { id: 'daemmerung', name: 'Dämmerung', desc: 'Abendrot und Pflaume', swatch: ['#1c1726', '#f08a5d'] },
] as const)
// designs of earlier versions
const OLD_DESIGNS: Record<string, DesignId> = { klubhaus: 'nacht', arena: 'nacht', studio: 'sommer' }
export function designOf(id: string): DesignId {
  return DESIGNS.some((d) => d.id === id) ? (id as DesignId) : OLD_DESIGNS[id] ?? 'sommer'
}
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
  lang: Lang
  notation: Notation // figurines (♘f3) or the piece letters of the language
}

export const settings = createStore<Settings>('settings', {
  pieceSet: 'staunty',
  whiteColor: 'elfenbein',
  blackColor: 'ebenholz',
  boardTheme: 'ahorn-nuss',
  design: 'sommer',
  sound: true,
  soundSet: 'turnier',
  vibration: true,
  coordinates: true,
  animation: true,
  animSpeed: 'normal',
  coach: true,
  name: '',
  onboarded: false,
  lang: deviceLang(),
  notation: 'figures',
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
  root.dataset.design = designOf(s.design)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#f6f2ea')
  const w = WHITE_COLORS.find((c) => c.id === s.whiteColor) ?? WHITE_COLORS[0]
  const b = BLACK_COLORS.find((c) => c.id === s.blackColor) ?? BLACK_COLORS[0]
  document.documentElement.style.setProperty('--w-filter', w.filter)
  document.documentElement.style.setProperty('--b-filter', b.filter)
}
applyPieceColors()
settings.subscribe(applyPieceColors)

// The language is read when the app starts, so switching it restarts the app.
export function switchLanguage(l: Lang) {
  if (l === settings.get().lang) return
  settings.set({ lang: l })
  window.location.reload()
}

// Like the language, the notation is read at start-up (texts are built when modules load).
export function switchNotation(n: Notation) {
  if (n === settings.get().notation) return
  settings.set({ notation: n })
  window.location.reload()
}
