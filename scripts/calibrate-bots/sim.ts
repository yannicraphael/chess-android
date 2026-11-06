import { Chess } from 'chess.js'
import { engineBot, botMove } from '../../src/bots'
import { engine, ref } from './nodeEngine'
const wp = (cp: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
const [ra, rb, games, depthArg] = process.argv.slice(2).map(Number)
const refDepth = depthArg || 11
async function evalW(fen: string) { // white POV cp, clipped
  const { candidates } = await ref.search(fen, { depth: refDepth, skill: 20, multiPv: 1 })
  const c = candidates[0]; if (!c) return 0
  const s = c.mate !== null ? Math.sign(c.mate) * 1000 : Math.max(-1000, Math.min(1000, c.scoreCp))
  return fen.split(' ')[1] === 'w' ? s : -s
}
const out: any = { a: { loss: [] as number[], acc: [] as number[], blunders: 0, mistakes: 0, moves: 0, balancedMoves: 0, balancedLoss: [] as number[] }, b: null as any, scoreA: 0, games: 0, plies: 0 }
out.b = JSON.parse(JSON.stringify(out.a))
for (let g = 0; g < games; g++) {
  const aWhite = g % 2 === 0
  const cfg = process.env.CFG ? JSON.parse(process.env.CFG) : null
  const A = { ...engineBot(ra), ...(cfg ?? {}) }, B = { ...engineBot(rb), ...(cfg ?? {}) }
  const c = new Chess()
  let ev = await evalW(c.fen())
  while (!c.isGameOver() && c.history().length < 200) {
    const white = c.turn() === 'w'
    const isA = white === aWhite
    const bot = isA ? A : B
    const { move } = await botMove(c.fen(), bot)
    c.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] as any })
    const ne = c.isCheckmate() ? (white ? 1000 : -1000) : c.isGameOver() ? 0 : await evalW(c.fen())
    const s = white ? 1 : -1
    const loss = Math.max(0, s * (ev - ne)); const wl = Math.max(0, wp(s * ev) - wp(s * ne))
    const st = isA ? out.a : out.b
    st.moves++; st.loss.push(Math.min(loss, 600)); st.acc.push(Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * wl) - 3.1669)))
    if (wl >= 30) st.blunders++; else if (wl >= 20) st.mistakes++
    if (Math.abs(ev) < 300) { st.balancedMoves++; st.balancedLoss.push(Math.min(loss, 1000)) }
    ev = ne
  }
  out.games++; out.plies += c.history().length
  let sc = 0.5; if (c.isCheckmate()) sc = (c.turn() === 'w') === aWhite ? 0 : 1; else if (c.history().length >= 200) sc = ev > 300 === aWhite ? 1 : ev < -300 === aWhite ? 0 : 0.5
  out.scoreA += sc
}
const avg = (x: number[]) => x.reduce((a, b) => a + b, 0) / Math.max(1, x.length)
const perf = (a: number) => Math.round(Math.max(100, Math.min(2900, 5741 - 1082 * Math.log(Math.max(a, 8)))) / 10) * 10
const sum = (st: any) => ({ perf: perf(avg(st.loss)), acpl: Math.round(avg(st.loss)), acplBal: Math.round(avg(st.balancedLoss)), acc: +avg(st.acc).toFixed(1), blundersPer40: +(st.blunders / st.moves * 40).toFixed(2), mistakesPer40: +(st.mistakes / st.moves * 40).toFixed(2) })
console.log(JSON.stringify({ ra, rb, games: out.games, scoreA: out.scoreA, avgPlies: Math.round(out.plies / out.games), A: sum(out.a), B: sum(out.b) }))
engine.quit(); ref.quit(); process.exit(0)
