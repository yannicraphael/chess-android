import { createStore } from './store'

// Offline Elo rating from games against the bots (their ratings act as opponents' ratings),
// plus a strength estimate from the accuracy of the player's moves.
export interface RatingState {
  rating: number
  games: number // rated games played
  peak: number
  history: { d: string; r: number }[] // rating after each rated game (last 100)
  perf: number[] // move-quality estimates of the last games (last 20)
  start: number // starting rating chosen at the first launch
}

export const rating = createStore<RatingState>('rating', {
  rating: 800,
  games: 0,
  peak: 800,
  history: [],
  perf: [],
  start: 800,
})

export function expectedScore(player: number, opponent: number) {
  return 1 / (1 + Math.pow(10, (opponent - player) / 400))
}

// K-factor: large at first so the rating finds its level quickly
export function kFactor(games: number) {
  return games < 10 ? 40 : games < 30 ? 28 : 20
}

export function ratingChange(player: number, opponent: number, score: number, games: number) {
  return Math.round(kFactor(games) * (score - expectedScore(player, opponent)))
}

export function recordRatedGame(opponent: number, outcome: 'win' | 'loss' | 'draw') {
  const s = rating.get()
  const score = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0
  const delta = ratingChange(s.rating, opponent, score, s.games)
  const r = Math.max(100, s.rating + delta)
  const d = new Date().toISOString().slice(0, 10)
  rating.set({ rating: r, games: s.games + 1, peak: Math.max(s.peak, r), history: [...s.history, { d, r }].slice(-100) })
  return { before: s.rating, after: r, delta: r - s.rating }
}

// Rough mapping from average centipawn loss to a rating (fitted to typical online ratings:
// about 80 cp loss at 1000, 55 at 1500, 35 at 2000, 20 at 2500).
export function perfFromAcpl(acpl: number) {
  const v = 5741 - 1082 * Math.log(Math.max(acpl, 8))
  return Math.round(Math.max(100, Math.min(2900, v)) / 10) * 10
}

export function recordPerf(p: number) {
  rating.set((s) => ({ perf: [...s.perf, p].slice(-20) }))
}

// average of the last 10 move-quality estimates
export function perfEstimate(s: RatingState = rating.get()) {
  const list = s.perf.slice(-10)
  if (list.length < 3) return null
  return Math.round(list.reduce((a, b) => a + b, 0) / list.length / 10) * 10
}

export function setStartRating(r: number) {
  const s = rating.get()
  if (s.games > 0) return
  rating.set({ rating: r, peak: r, start: r })
}
