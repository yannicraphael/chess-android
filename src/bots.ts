import { Chess } from 'chess.js'
import { engine } from './engine/stockfish'

export interface Bot {
  id: string
  name: string
  rating: number
  color: string // avatar background
  emoji: string
  description: string
  // engine settings
  skill: number
  depth: number
  multiPv: number
  // chance of playing a completely random legal move
  blunder: number
  // how strongly the bot prefers better moves among its candidates (lower = sharper)
  temperature: number
}

export const BOTS: Bot[] = [
  {
    id: 'kiki', name: 'Kiki', rating: 400, color: '#e8a33d', emoji: '🐣',
    description: 'Fängt gerade erst an und übersieht oft hängende Figuren.',
    skill: 0, depth: 1, multiPv: 8, blunder: 0.35, temperature: 400,
  },
  {
    id: 'bruno', name: 'Bruno', rating: 700, color: '#c0703a', emoji: '🐻',
    description: 'Greift gern an, denkt aber selten an die eigene Verteidigung.',
    skill: 1, depth: 2, multiPv: 6, blunder: 0.18, temperature: 250,
  },
  {
    id: 'lena', name: 'Lena', rating: 1000, color: '#4f9bd9', emoji: '🦊',
    description: 'Solide im Vereinsniveau. Bestraft grobe Fehler zuverlässig.',
    skill: 3, depth: 4, multiPv: 5, blunder: 0.08, temperature: 140,
  },
  {
    id: 'viktor', name: 'Viktor', rating: 1300, color: '#7d5bc9', emoji: '🦉',
    description: 'Spielt ruhig und positionell, macht nur ab und zu Ungenauigkeiten.',
    skill: 6, depth: 6, multiPv: 4, blunder: 0.04, temperature: 80,
  },
  {
    id: 'mira', name: 'Mira', rating: 1600, color: '#d24f6c', emoji: '🐆',
    description: 'Taktisch wach. Wer eine Figur einstellt, verliert sie auch.',
    skill: 10, depth: 9, multiPv: 3, blunder: 0.015, temperature: 40,
  },
  {
    id: 'falk', name: 'Dr. Falk', rating: 2000, color: '#3a9a6a', emoji: '🦅',
    description: 'Turnierstark, gute Endspieltechnik und kaum Fehler.',
    skill: 15, depth: 12, multiPv: 2, blunder: 0, temperature: 15,
  },
  {
    id: 'titan', name: 'Titan', rating: 3000, color: '#555c66', emoji: '🤖',
    description: 'Volle Engine-Stärke. Nur für mutige Momente.',
    skill: 20, depth: 18, multiPv: 1, blunder: 0, temperature: 0,
  },
]

// Asks the engine for candidate moves and lets the bot pick one according to
// its personality. Returns the chosen move in UCI notation.
export async function botMove(fen: string, bot: Bot): Promise<string> {
  const chess = new Chess(fen)
  const legal = chess.moves({ verbose: true })
  if (Math.random() < bot.blunder) {
    const m = legal[Math.floor(Math.random() * legal.length)]
    return m.from + m.to + (m.promotion ?? '')
  }
  const { best, candidates } = await engine.search(fen, {
    depth: bot.depth,
    multiPv: Math.min(bot.multiPv, legal.length),
    skill: bot.skill,
  })
  if (bot.temperature <= 0 || candidates.length <= 1) return best
  const top = candidates[0].scoreCp
  const weights = candidates.map((c) => Math.exp(-Math.min(top - c.scoreCp, 3000) / bot.temperature))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r <= 0) return candidates[i].move
  }
  return best
}

export async function hintMove(fen: string): Promise<string> {
  const { best } = await engine.search(fen, { depth: 14, skill: 20 })
  return best
}
