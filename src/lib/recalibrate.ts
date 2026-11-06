import { archive } from './archive'
import { expectedScore, kFactor, rating } from './rating'

// Until November 2026 the bots between about 700 and 2000 played clearly stronger than their
// rating (measured with Stockfish in bot-against-bot games: the "1030" bot played like about 1450).
// Losses against them cost the player too many points. This runs once and replays the player's
// rated games from the archive with the strength the bots really had back then.

const CALIBRATION = 2

// label of the bot -> strength it really played with the old settings
const OLD_STRENGTH: [number, number][] = [
  [550, 550],
  [700, 800],
  [850, 1150],
  [1000, 1450],
  [1150, 1650],
  [1300, 1850],
  [1450, 2050],
  [1600, 2250],
  [1800, 2450],
  [2000, 2600],
  [2500, 2900],
  [3200, 3200],
]

export function oldStrength(r: number) {
  if (r <= OLD_STRENGTH[0][0]) return r
  for (let i = 1; i < OLD_STRENGTH.length; i++) {
    const [r0, s0] = OLD_STRENGTH[i - 1]
    const [r1, s1] = OLD_STRENGTH[i]
    if (r <= r1) return Math.round(s0 + ((s1 - s0) * (r - r0)) / (r1 - r0))
  }
  return r
}

export function recalibrateRating() {
  const s = rating.get()
  if ((s.calib ?? 1) >= CALIBRATION) return
  const rated = archive.get().games.filter((g) => g.rated && g.ratingAfter !== undefined && g.ratingDelta !== undefined).reverse()
  if (!s.games || !rated.length) {
    rating.set({ calib: CALIBRATION })
    return
  }
  // older rated games may have dropped out of the archive: start from the rating before the oldest kept one
  let r = rated[0].ratingAfter! - rated[0].ratingDelta!
  let games = s.games - rated.length
  let peak = r
  const history: { d: string; r: number }[] = []
  const patch = new Map<string, { ratingAfter: number; ratingDelta: number }>()
  for (const g of rated) {
    const score = g.outcome === 'win' ? 1 : g.outcome === 'draw' ? 0.5 : 0
    const delta = Math.round(kFactor(games) * (score - expectedScore(r, (g.cal ?? 1) < CALIBRATION ? oldStrength(g.botRating) : g.botRating)))
    const after = Math.max(100, r + delta)
    patch.set(g.id, { ratingAfter: after, ratingDelta: after - r })
    r = after
    games++
    peak = Math.max(peak, r)
    history.push({ d: g.date.slice(0, 10), r })
  }
  // only ever correct upwards: the old bots were too strong, never too weak
  if (r <= s.rating) {
    rating.set({ calib: CALIBRATION })
    return
  }
  const kept = s.history.slice(0, Math.max(0, s.history.length - history.length))
  rating.set({ rating: r, peak: Math.max(peak, ...kept.map((h) => h.r)), history: [...kept, ...history].slice(-100), calib: CALIBRATION })
  archive.set((a) => ({ games: a.games.map((g) => (patch.has(g.id) ? { ...g, ...patch.get(g.id) } : g)) }))
}
