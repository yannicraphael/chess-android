import { MOTIFS, MOTIF_LEVEL_NAMES, MOTIF_SET_SIZE } from '../lib/puzzles'

export interface GameLevel {
  id: string // progress key, e.g. "coords-1"
  n: number
  name: string
  description: string
  stars: [number, number, number] // score needed for 1, 2, 3 stars
  theme?: string // tactics motif levels
  start?: number // puzzle sprint: starting puzzle rating
  seconds?: number // puzzle sprint: time limit
}

export interface MiniGame {
  id: string
  kind: 'coords' | 'knight' | 'sprint' | 'motif'
  title: string
  icon: string
  teaser: string
  skill: string
  levels: GameLevel[]
}

export const MINI_GAMES: MiniGame[] = [
  {
    id: 'coords',
    kind: 'coords',
    title: 'Koordinaten-Blitz',
    icon: 'target',
    teaser: 'Tippe in 30 Sekunden so viele genannte Felder wie möglich.',
    skill: 'Brettübersicht: Felder sofort finden, auch aus Sicht von Schwarz.',
    levels: [
      { id: 'coords-1', n: 1, name: 'Mit Hilfe', description: 'Weiß unten, Koordinaten am Rand', stars: [8, 15, 22] },
      { id: 'coords-2', n: 2, name: 'Ohne Hilfe', description: 'Weiß unten, keine Koordinaten', stars: [8, 15, 22] },
      { id: 'coords-3', n: 3, name: 'Schwarz unten', description: 'Brett gedreht, keine Koordinaten', stars: [7, 13, 20] },
      { id: 'coords-4', n: 4, name: 'Profi', description: 'Brett wechselt jedes Mal zufällig', stars: [6, 12, 18] },
    ],
  },
  {
    id: 'knight',
    kind: 'knight',
    title: 'Springer-Sprint',
    icon: 'knight',
    teaser: 'Bring den Springer mit möglichst wenigen Sprüngen zum Ziel.',
    skill: 'Springerwege sehen: wichtig für Gabeln und Verteidigung.',
    levels: [
      { id: 'knight-1', n: 1, name: 'Erste Sprünge', description: '1 bis 2 Sprünge, Zielfelder werden gezeigt', stars: [1, 2, 3] },
      { id: 'knight-2', n: 2, name: 'Freihand', description: '2 bis 3 Sprünge, ohne Hilfe', stars: [1, 2, 3] },
      { id: 'knight-3', n: 3, name: 'Weite Wege', description: '3 bis 4 Sprünge', stars: [1, 2, 3] },
      { id: 'knight-4', n: 4, name: 'Ecken-Meister', description: '4 bis 6 Sprünge, gern über Ecken', stars: [1, 2, 3] },
    ],
  },
]

export const SPRINT: MiniGame = {
  id: 'sprint',
  kind: 'sprint',
  title: 'Taktik-Sprint',
  icon: 'bolt',
  teaser: 'Löse so viele Aufgaben wie möglich, bevor die Zeit abläuft. Drei Fehler und Schluss.',
  skill: 'Muster schnell erkennen, wie in einer Blitzpartie.',
  levels: [
    { id: 'sprint-1', n: 1, name: 'Aufwärmen', description: 'Leichte Aufgaben, 3 Minuten', stars: [6, 12, 18], start: 450, seconds: 180 },
    { id: 'sprint-2', n: 2, name: 'Verein', description: 'Ab Wertung 800, 3 Minuten', stars: [5, 10, 15], start: 800, seconds: 180 },
    { id: 'sprint-3', n: 3, name: 'Turnier', description: 'Ab Wertung 1100, 5 Minuten', stars: [5, 10, 15], start: 1100, seconds: 300 },
    { id: 'sprint-4', n: 4, name: 'Meister', description: 'Ab Wertung 1400, 5 Minuten', stars: [4, 8, 12], start: 1400, seconds: 300 },
  ],
}

// one mini-game per tactical motif, three difficulty levels each (score = puzzles solved on the first try)
export const MOTIF_GAMES: MiniGame[] = MOTIFS.map((m) => ({
  id: 'motif-' + m.theme,
  kind: 'motif',
  title: m.name,
  icon: m.icon, // piece code
  teaser: m.tip,
  skill: m.tip,
  levels: MOTIF_LEVEL_NAMES.map((name, i) => ({
    id: `motif-${m.theme}-${i + 1}`, n: i + 1, name, description: `${MOTIF_SET_SIZE} Aufgaben`,
    stars: [3, 4, 5] as [number, number, number], theme: m.theme,
  })),
}))

export function starsFor(level: GameLevel, score: number) {
  return level.stars.filter((s) => score >= s).length
}
