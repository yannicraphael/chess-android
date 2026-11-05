import { ENDGAMES, endgameLevelId } from '../data/endgames'
import { LESSONS, lessonLevelId } from '../data/lessons'
import { OPENINGS, OPENING_LEVELS, openingLevelId } from '../data/openings'
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
  kind: 'coords' | 'knight' | 'hanging' | 'mate1' | 'sprint' | 'motif' | 'opening' | 'endgame' | 'lesson'
  ref?: string // id of the opening, endgame or lesson
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
  {
    id: 'hanging',
    kind: 'hanging',
    title: 'Hängende Figur',
    icon: 'eye',
    teaser: 'Finde und schlage die ungedeckte Figur, so schnell du kannst.',
    skill: 'Die wichtigste Gewohnheit überhaupt: vor jedem Zug prüfen, was ungedeckt herumsteht.',
    levels: [
      { id: 'hanging-1', n: 1, name: 'Aufwärmen', description: 'Leichte Stellungen, 90 Sekunden', stars: [5, 10, 15], seconds: 90 },
      { id: 'hanging-2', n: 2, name: 'Blick schärfen', description: 'Alle Stellungen, 60 Sekunden', stars: [4, 8, 12], seconds: 60 },
      { id: 'hanging-3', n: 3, name: 'Auch Bauern', description: 'Auch ungedeckte Bauern, 60 Sekunden', stars: [4, 8, 12], seconds: 60 },
    ],
  },
  {
    id: 'mate1',
    kind: 'mate1',
    title: 'Matt in einem Zug',
    icon: 'crown',
    teaser: 'Setze in einem Zug matt. Wie viele Matts schaffst du gegen die Uhr?',
    skill: 'Mattbilder sofort erkennen, damit du in der Partie kein Matt verpasst.',
    levels: [
      { id: 'mate1-1', n: 1, name: 'Aufwärmen', description: 'Leichte Matts, 90 Sekunden', stars: [5, 10, 15], seconds: 90 },
      { id: 'mate1-2', n: 2, name: 'Mattjäger', description: 'Alle Matts, 60 Sekunden', stars: [4, 8, 12], seconds: 60 },
      { id: 'mate1-3', n: 3, name: 'Versteckte Matts', description: 'Schwerere Stellungen, 60 Sekunden', stars: [3, 6, 10], seconds: 60 },
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

// score of these games is the number of stars (1-3) earned directly
const STARS: [number, number, number] = [1, 2, 3]

export const OPENING_GAMES: MiniGame[] = OPENINGS.map((o) => ({
  id: 'opening-' + o.id, kind: 'opening', ref: o.id, title: o.name, icon: o.side === 'w' ? 'wN' : 'bN',
  teaser: o.first, skill: o.summary,
  levels: OPENING_LEVELS.map((l) => ({ id: openingLevelId(o, l.n), n: l.n, name: l.name, description: l.description, stars: STARS })),
}))

export const ENDGAME_GAMES: MiniGame[] = ENDGAMES.map((e) => ({
  id: 'endgame-' + e.id, kind: 'endgame', ref: e.id, title: e.name, icon: e.group, teaser: e.task, skill: e.tip,
  levels: [{ id: endgameLevelId(e), n: 1, name: e.name, description: e.task, stars: STARS }],
}))

export const LESSON_GAMES: MiniGame[] = LESSONS.map((l) => ({
  id: 'lesson-' + l.id, kind: 'lesson', ref: l.id, title: l.title, icon: l.icon, teaser: l.teaser, skill: l.teaser,
  levels: [{ id: lessonLevelId(l), n: 1, name: l.title, description: l.teaser, stars: STARS }],
}))
