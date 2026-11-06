import { spawn } from 'node:child_process'
export interface Candidate { move: string; scoreCp: number; mate: number | null }
class Engine {
  p = spawn('node', [new URL('../../node_modules/stockfish/scripts/cli.js', import.meta.url).pathname])
  buf = ''
  listeners = new Set<(l: string) => void>()
  queue: Promise<unknown> = Promise.resolve()
  constructor() {
    this.p.stdout.on('data', (d) => { this.buf += d; let i; while ((i = this.buf.indexOf('\n')) >= 0) { const l = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1); for (const f of [...this.listeners]) f(l) } })
    this.send('uci'); this.send('setoption name Hash value 16')
  }
  send(c: string) { this.p.stdin.write(c + '\n') }
  waitFor(pr: (l: string) => boolean) { return new Promise<string>((res) => { const fn = (l: string) => { if (pr(l)) { this.listeners.delete(fn); res(l) } }; this.listeners.add(fn) }) }
  search(fen: string, opts: any): Promise<{ best: string; candidates: Candidate[] }> {
    const run = async () => {
      const multiPv = opts.multiPv ?? 1
      this.send(`setoption name Skill Level value ${opts.skill ?? 20}`)
      this.send(`setoption name MultiPV value ${multiPv}`)
      const r = this.waitFor((l) => l === 'readyok'); this.send('isready'); await r
      const byRank = new Map<number, Candidate>()
      const onInfo = (line: string) => {
        if (!line.startsWith('info') || !line.includes(' pv ')) return
        const rank = Number(/ multipv (\d+)/.exec(line)?.[1] ?? 1)
        const move = / pv (\S+)/.exec(line)?.[1]; if (!move) return
        const mateM = / score mate (-?\d+)/.exec(line); const cpM = / score cp (-?\d+)/.exec(line)
        const mate = mateM ? Number(mateM[1]) : null
        const scoreCp = mate !== null ? Math.sign(mate) * 100000 - mate : Number(cpM?.[1] ?? 0)
        byRank.set(rank, { move, scoreCp, mate })
      }
      this.listeners.add(onInfo)
      const done = this.waitFor((l) => l.startsWith('bestmove'))
      this.send(`position fen ${fen}`)
      if (opts.movetime) this.send(`go movetime ${opts.movetime}`); else this.send(`go depth ${opts.depth ?? 10}`)
      const bl = await done; this.listeners.delete(onInfo)
      return { best: bl.split(' ')[1], candidates: [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c) }
    }
    const p = this.queue.then(run, run); this.queue = p.catch(() => undefined); return p as any
  }
  quit() { this.send('quit') }
}
export const engine = new Engine()
export const ref = new Engine()
