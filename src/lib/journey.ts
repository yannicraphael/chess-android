import { L } from '../i18n'
import { createStore } from './store'
import { hasTheme, loadPuzzles, type Puzzle } from './puzzles'

// The journey through Schachland: 100 stations in 10 regions. Each station has 6 puzzles of the
// region's motif; the difficulty rises from about 500 at station 1 to about 2200 at station 100.

export const STATIONS = 100
export const PER_REGION = 10
export const STATION_SIZE = 6

export interface Region {
  name: string
  motif: string // short name of the tactical theme
  themes: string[] // Lichess puzzle themes (empty = all)
  theory?: string // MOTIF_THEORY key
  intro: string // what the region teaches
}

const REGION_TEXT = L<{ name: string; motif: string; intro: string }[]>([
  { name: 'Dorfplatz', motif: 'Ungedeckte Figuren und Matt in 1', intro: 'Schau vor jedem Zug, was ungedeckt herumsteht und ob ein Matt möglich ist.' },
  { name: 'Gabelwald', motif: 'Gabel', intro: 'Eine Figur greift zwei auf einmal an. Der Gegner kann nur eine retten.' },
  { name: 'Fesselfluss', motif: 'Fesselung', intro: 'Eine gefesselte Figur darf oder sollte nicht ziehen. Greif sie ein zweites Mal an.' },
  { name: 'Grundreihen-Küste', motif: 'Grundreihenmatt', intro: 'Der König steht hinter seinen eigenen Bauern gefangen.' },
  { name: 'Spießgrat', motif: 'Spieß', intro: 'Wie eine Fesselung, nur steht die wertvollere Figur vorne und muss weichen.' },
  { name: 'Abzugsschlucht', motif: 'Abzugsangriff', intro: 'Ziehe eine Figur weg und öffne die Linie der Figur dahinter.' },
  { name: 'Opferhochland', motif: 'Opfer', intro: 'Gib Material her, um mehr zurückzubekommen.' },
  { name: 'Mattgebirge', motif: 'Matt in 2 und 3', intro: 'Schachs zuerst prüfen. Jeder Zug muss den König weiter einengen.' },
  { name: 'Gletscher', motif: 'Endspiel', intro: 'Wenige Figuren, genaue Rechnung. Der König wird zur Kampffigur.' },
  { name: 'Gipfel', motif: 'Alle Motive', intro: 'Alles, was du unterwegs gelernt hast, in schweren Stellungen gemischt.' },
])
// Lichess themes per region (not translated)
const REGION_META: { themes: string[]; theory?: string }[] = [
  { themes: ['hangingPiece', 'mateIn1'], theory: 'hangingPiece' },
  { themes: ['fork'], theory: 'fork' },
  { themes: ['pin'], theory: 'pin' },
  { themes: ['backRankMate'], theory: 'backRankMate' },
  { themes: ['skewer'], theory: 'skewer' },
  { themes: ['discoveredAttack'], theory: 'discoveredAttack' },
  { themes: ['sacrifice'], theory: 'sacrifice' },
  { themes: ['mateIn2', 'mateIn3'], theory: 'mateIn2' },
  { themes: ['endgame'] },
  { themes: [] },
]
export const REGIONS: Region[] = REGION_TEXT.map((x, i) => ({ ...x, ...REGION_META[i] }))

export const regionOf = (station: number) => Math.min(REGIONS.length - 1, Math.floor(station / PER_REGION))
export const isPass = (station: number) => (station + 1) % PER_REGION === 0
export const targetRating = (station: number) => Math.round(500 + station * 17)

export interface JourneyState {
  stars: Record<number, number> // station index -> best stars (0..3)
  run: { station: number; ids: string[]; results: boolean[] } | null // unfinished station
}
export const journey = createStore<JourneyState>('journey', { stars: {}, run: null })

// first station without a star; everything up to it is open
export function currentStation(s: JourneyState = journey.get()) {
  let i = 0
  while (i < STATIONS && (s.stars[i] ?? 0) > 0) i++
  return Math.min(i, STATIONS - 1)
}
export const totalStars = (s: JourneyState = journey.get()) => Object.values(s.stars).reduce((a, n) => a + n, 0)

export function starsFor(solved: number) {
  return solved >= STATION_SIZE ? 3 : solved >= STATION_SIZE - 1 ? 2 : solved >= STATION_SIZE - 2 ? 1 : 0
}

// Puzzles for every station, picked once per region so no puzzle repeats inside a region.
let plan: Promise<Puzzle[][]> | null = null
export function stationPlan(): Promise<Puzzle[][]> {
  if (!plan) {
    plan = loadPuzzles().then((list) => {
      const out: Puzzle[][] = []
      REGIONS.forEach((reg, r) => {
        const used = new Set<string>()
        const pool = list.filter((p) => p.moves.split(' ').length <= 8 && (reg.themes.length === 0 || reg.themes.some((th) => hasTheme(p, th))))
        for (let j = 0; j < PER_REGION; j++) {
          const st = r * PER_REGION + j
          const target = targetRating(st)
          const pick = pool.filter((p) => !used.has(p.id))
            .sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target) || (a.id < b.id ? -1 : 1))
            .slice(0, STATION_SIZE)
            .sort((a, b) => a.rating - b.rating)
          pick.forEach((p) => used.add(p.id))
          out[st] = pick
        }
      })
      return out
    })
    plan.catch(() => { plan = null })
  }
  return plan
}
