import { Chess, type Color } from 'chess.js'
import { evaluate } from '../engine/stockfish'
import { perfFromAcpl, recordPerf } from './rating'
import { createStore } from './store'

// Saved games (newest first) with their engine analysis, and positions where the player
// made a mistake, which come back later as puzzles.

export interface PosEval { cp: number; mate: number | null; best: string | null }

export interface ArchivedGame {
  id: string
  date: string // ISO
  botId: string
  botName: string
  botRating: number
  color: Color
  outcome: 'win' | 'loss' | 'draw'
  reason: string
  pgn: string
  moves: number
  rated: boolean
  ratingAfter?: number
  ratingDelta?: number
  tc?: string // time control label
  evals?: PosEval[]
  accuracy?: number
  perf?: number
}

export interface MistakePuzzle {
  id: string
  gameId: string
  fen: string
  best: string // uci
  played: string // SAN, German notation is applied when shown
  bestCp: number // evaluation of the best move for the side to move
  opponent: string
  date: string
  solved: boolean
}

export const archive = createStore<{ games: ArchivedGame[]; mistakes: MistakePuzzle[] }>('archive', { games: [], mistakes: [] })

export function addGame(g: ArchivedGame) {
  archive.set((s) => ({ games: [g, ...s.games].slice(0, 200) }))
  void analyzeStored(g.id)
}

export function updateGame(id: string, patch: Partial<ArchivedGame>) {
  archive.set((s) => ({ games: s.games.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
}

export function fensOf(pgn: string) {
  const c = new Chess()
  if (pgn) c.loadPgn(pgn)
  const moves = c.history({ verbose: true })
  const r = new Chess()
  const fens = [r.fen()]
  for (const m of moves) { r.move(m.san); fens.push(r.fen()) }
  return { moves, fens }
}

const winPct = (cp: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
export const clip = (cp: number) => Math.max(-1000, Math.min(1000, cp))

// ---------- analysis (shared by the review screen and the background job) ----------

const running = new Map<string, { promise: Promise<PosEval[]>; progress: number; listeners: Set<(n: number) => void> }>()

export function analysisProgress(key: string) {
  return running.get(key)?.progress ?? 0
}

export function analyze(key: string, fens: string[], onProgress?: (done: number) => void): Promise<PosEval[]> {
  let job = running.get(key)
  if (!job) {
    const listeners = new Set<(n: number) => void>()
    const j = { promise: null as unknown as Promise<PosEval[]>, progress: 0, listeners }
    j.promise = (async () => {
      const out: PosEval[] = []
      for (const f of fens) {
        const c = new Chess(f)
        if (c.isCheckmate()) out.push({ cp: c.turn() === 'w' ? -10000 : 10000, mate: 0, best: null })
        else if (c.isGameOver()) out.push({ cp: 0, mate: null, best: null })
        else {
          const e = await evaluate(f, 11)
          out.push({ cp: e.cp, mate: e.mate, best: e.best })
        }
        j.progress = out.length
        listeners.forEach((l) => l(out.length))
      }
      return out
    })()
    j.promise.finally(() => running.delete(key))
    running.set(key, j)
    job = j
  }
  if (onProgress) job.listeners.add(onProgress)
  return job.promise
}

export interface GradedMove { loss: number; accuracy: number; best: string | null; uci: string; color: Color }

export function gradeMoves(history: { color: Color; from: string; to: string; promotion?: string }[], evals: PosEval[]): GradedMove[] {
  return history.map((m, i) => {
    const sign = m.color === 'w' ? 1 : -1
    const before = clip(evals[i].cp) * sign
    const after = clip(evals[i + 1].cp) * sign
    const loss = Math.max(0, before - after)
    const wpLoss = Math.max(0, winPct(before) - winPct(after))
    const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * wpLoss) - 3.1669))
    return { loss, accuracy, best: evals[i].best, uci: m.from + m.to + (m.promotion ?? ''), color: m.color }
  })
}

// Accuracy and rating estimate of one side; null for very short games
export function performance(graded: GradedMove[], color: Color) {
  const mine = graded.filter((g) => g.color === color)
  if (mine.length < 10) return null
  const acpl = mine.reduce((s, g) => s + Math.min(g.loss, 600), 0) / mine.length
  const accuracy = Math.round(mine.reduce((s, g) => s + g.accuracy, 0) / mine.length)
  return { accuracy, perf: perfFromAcpl(acpl) }
}

// Analyses a stored game once: saves evaluations, accuracy, rating estimate and mistake puzzles.
export async function analyzeStored(id: string) {
  const g = archive.get().games.find((x) => x.id === id)
  if (!g || g.evals) return
  const { moves, fens } = fensOf(g.pgn)
  if (moves.length < 2) return
  const evals = await analyze(id, fens)
  const graded = gradeMoves(moves, evals)
  const p = performance(graded, g.color)
  updateGame(id, { evals, accuracy: p?.accuracy, perf: p?.perf })
  if (p && g.rated) recordPerf(p.perf)
  // the player's clear mistakes become puzzles (only when the position was not already lost)
  const found: MistakePuzzle[] = []
  graded.forEach((m, i) => {
    if (m.color !== g.color || !m.best || m.loss < 150) return
    const before = clip(evals[i].cp) * (m.color === 'w' ? 1 : -1)
    if (before < -300) return
    found.push({
      id: `${id}-${i}`, gameId: id, fen: fens[i], best: m.best, played: moves[i].san, bestCp: before,
      opponent: g.botName, date: g.date, solved: false,
    })
  })
  if (found.length) archive.set((s) => ({ mistakes: [...found, ...s.mistakes].slice(0, 150) }))
}

// analyse games that were saved but not analysed yet (e.g. app closed during analysis)
export function resumeAnalysis() {
  for (const g of archive.get().games.slice(0, 5)) if (!g.evals) void analyzeStored(g.id)
}
