import { createStore } from './store'

// Tactics puzzles from the Lichess puzzle database (CC0).
// The first move in `moves` is the opponent's move, the solver answers after it.
export interface Puzzle {
  id: string
  fen: string
  moves: string // UCI moves separated by spaces
  rating: number
  themes: string
}

let cache: Promise<Puzzle[]> | null = null
export function loadPuzzles(): Promise<Puzzle[]> {
  if (!cache) {
    cache = fetch('puzzles.json').then((r) => {
      if (!r.ok) throw new Error('puzzles')
      return r.json() as Promise<Puzzle[]>
    })
    cache.catch(() => { cache = null })
  }
  return cache
}

export const THEME_NAMES: Record<string, string> = {
  mateIn1: 'Matt in 1', mateIn2: 'Matt in 2', mateIn3: 'Matt in 3', mateIn4: 'Matt in 4', mate: 'Matt',
  hangingPiece: 'Hängende Figur', fork: 'Gabel', pin: 'Fesselung', skewer: 'Spieß',
  discoveredAttack: 'Abzugsangriff', doubleCheck: 'Doppelschach', backRankMate: 'Grundreihenmatt',
  sacrifice: 'Opfer', deflection: 'Ablenkung', attraction: 'Hinlenkung', clearance: 'Räumung',
  interference: 'Unterbrechung', intermezzo: 'Zwischenzug', trappedPiece: 'Gefangene Figur',
  promotion: 'Umwandlung', advancedPawn: 'Weit vorgerückter Bauer', capturingDefender: 'Verteidiger schlagen',
  kingsideAttack: 'Angriff am Königsflügel', queensideAttack: 'Angriff am Damenflügel', exposedKing: 'Offener König',
  defensiveMove: 'Verteidigungszug', quietMove: 'Stiller Zug', xRayAttack: 'Röntgenangriff', zugzwang: 'Zugzwang',
  smotheredMate: 'Ersticktes Matt', anastasiaMate: 'Anastasia-Matt', arabianMate: 'Arabisches Matt',
  hookMate: 'Hakenmatt', bodenMate: 'Boden-Matt', doubleBishopMate: 'Läuferpaar-Matt', dovetailMate: 'Schwalbenschwanz-Matt',
  pillsburysMate: 'Pillsbury-Matt', operaMate: 'Opernmatt', killBoxMate: 'Kasten-Matt', vukovicMate: 'Vuković-Matt',
  endgame: 'Endspiel', middlegame: 'Mittelspiel', opening: 'Eröffnung',
  rookEndgame: 'Turmendspiel', pawnEndgame: 'Bauernendspiel', queenEndgame: 'Damenendspiel',
  bishopEndgame: 'Läuferendspiel', knightEndgame: 'Springerendspiel', queenRookEndgame: 'Dame-Turm-Endspiel',
  enPassant: 'En passant', castling: 'Rochade', underPromotion: 'Unterverwandlung',
}

// themes worth showing to the player after a puzzle (skip length/advantage tags)
export function themeLabels(p: Puzzle) {
  const skip = new Set(['short', 'long', 'veryLong', 'oneMove', 'crushing', 'advantage', 'equality', 'master', 'masterVsMaster', 'superGM', 'mate'])
  return p.themes.split(' ').filter((t) => t && !skip.has(t) && THEME_NAMES[t]).map((t) => THEME_NAMES[t])
}

export function hasTheme(p: Puzzle, theme: string) {
  return (' ' + p.themes + ' ').includes(' ' + theme + ' ')
}

// ---------- rated puzzle training ----------

export interface PuzzleStats {
  rating: number
  peak: number
  played: number
  solved: number
  streak: number
  bestStreak: number
  seen: string[] // ids of puzzles already shown in rated mode
  recent: { id: string; ok: boolean; delta: number }[]
}

export const puzzleStats = createStore<PuzzleStats>('puzzleStats', {
  rating: 800,
  peak: 800,
  played: 0,
  solved: 0,
  streak: 0,
  bestStreak: 0,
  seen: [],
  recent: [],
})

// Elo update; fast in the beginning so the rating settles quickly
export function ratingDelta(player: number, puzzle: number, solved: boolean, played: number) {
  const k = played < 15 ? 48 : played < 50 ? 32 : 20
  const expected = 1 / (1 + Math.pow(10, (puzzle - player) / 400))
  return Math.round(k * ((solved ? 1 : 0) - expected))
}

export function pickRated(list: Puzzle[], rating: number, seen: string[], avoid?: string) {
  const s = new Set(seen)
  for (const range of [75, 150, 250, 400, 4000]) {
    const pool = list.filter((p) => !s.has(p.id) && p.id !== avoid && Math.abs(p.rating - rating) <= range)
    if (pool.length >= 3 || range === 4000) {
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)]
    }
  }
  // everything seen: start over
  const pool = list.filter((p) => p.id !== avoid && Math.abs(p.rating - rating) <= 200)
  return (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))]
}

// ---------- motif levels ----------

export interface Motif {
  theme: string
  name: string
  icon: string
  tip: string
}

export const MOTIFS: Motif[] = [
  { theme: 'mateIn1', name: 'Matt in 1', icon: '♚', tip: 'Ein Zug, und der König ist matt.' },
  { theme: 'hangingPiece', name: 'Hängende Figur', icon: '🎁', tip: 'Schlage die ungedeckte Figur.' },
  { theme: 'backRankMate', name: 'Grundreihenmatt', icon: '🧱', tip: 'Der König ist hinter seinen Bauern gefangen.' },
  { theme: 'fork', name: 'Gabel', icon: '🍴', tip: 'Eine Figur greift zwei auf einmal an.' },
  { theme: 'pin', name: 'Fesselung', icon: '📌', tip: 'Die Figur darf oder sollte nicht wegziehen.' },
  { theme: 'skewer', name: 'Spieß', icon: '🍢', tip: 'Wie die Fesselung, nur steht die wertvollere Figur vorn.' },
  { theme: 'discoveredAttack', name: 'Abzugsangriff', icon: '💥', tip: 'Ziehe eine Figur weg und öffne die Linie dahinter.' },
  { theme: 'mateIn2', name: 'Matt in 2', icon: '👑', tip: 'Zwei Züge bis zum Matt. Schach zuerst prüfen!' },
  { theme: 'sacrifice', name: 'Opfer', icon: '🔥', tip: 'Gib Material her, um mehr zurückzubekommen.' },
]

export const MOTIF_LEVEL_NAMES = ['Leicht', 'Mittel', 'Schwer']
export const MOTIF_SET_SIZE = 5

// Puzzles of a motif sorted by rating and split into three difficulty thirds (max. rating 2100)
export function motifPool(list: Puzzle[], theme: string, level: number) {
  const all = list.filter((p) => hasTheme(p, theme) && p.rating <= 2100).sort((a, b) => a.rating - b.rating)
  const third = Math.ceil(all.length / 3)
  return all.slice((level - 1) * third, level * third)
}

export function sample<T>(arr: T[], n: number) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}
