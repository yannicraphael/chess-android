// Thin wrapper around the Stockfish WebAssembly engine (runs in a Web Worker
// and speaks the UCI protocol). Searches are queued so only one runs at a time.

export interface Candidate {
  move: string // UCI notation, e.g. "e2e4" or "e7e8q"
  scoreCp: number // centipawns from the side to move; mates mapped to ±100000
  mate: number | null
}

export interface SearchOptions {
  depth?: number
  movetime?: number
  multiPv?: number
  skill?: number // 0..20
}

export interface SearchResult {
  best: string
  candidates: Candidate[]
}

const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`

class Engine {
  private worker: Worker | null = null
  private listeners = new Set<(line: string) => void>()
  private ready: Promise<void> | null = null
  private queue: Promise<unknown> = Promise.resolve()

  private send(cmd: string) {
    this.worker?.postMessage(cmd)
  }

  private waitFor(predicate: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      const fn = (line: string) => {
        if (predicate(line)) {
          this.listeners.delete(fn)
          resolve(line)
        }
      }
      this.listeners.add(fn)
    })
  }

  init(): Promise<void> {
    if (this.ready) return this.ready
    this.worker = new Worker(ENGINE_URL)
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data)
      for (const l of [...this.listeners]) l(line)
    }
    this.ready = (async () => {
      const uciok = this.waitFor((l) => l === 'uciok')
      this.send('uci')
      await uciok
      const readyok = this.waitFor((l) => l === 'readyok')
      this.send('isready')
      await readyok
    })()
    return this.ready
  }

  search(fen: string, opts: SearchOptions): Promise<SearchResult> {
    const run = async () => {
      await this.init()
      const multiPv = opts.multiPv ?? 1
      this.send(`setoption name Skill Level value ${opts.skill ?? 20}`)
      this.send(`setoption name MultiPV value ${multiPv}`)
      const readyok = this.waitFor((l) => l === 'readyok')
      this.send('isready')
      await readyok

      const byRank = new Map<number, Candidate>()
      const onInfo = (line: string) => {
        if (!line.startsWith('info') || !line.includes(' pv ')) return
        const rank = Number(/ multipv (\d+)/.exec(line)?.[1] ?? 1)
        const move = / pv (\S+)/.exec(line)?.[1]
        if (!move) return
        const mateM = / score mate (-?\d+)/.exec(line)
        const cpM = / score cp (-?\d+)/.exec(line)
        const mate = mateM ? Number(mateM[1]) : null
        const scoreCp = mate !== null ? Math.sign(mate) * 100000 - mate : Number(cpM?.[1] ?? 0)
        byRank.set(rank, { move, scoreCp, mate })
      }
      this.listeners.add(onInfo)
      const done = this.waitFor((l) => l.startsWith('bestmove'))
      this.send(`position fen ${fen}`)
      if (opts.movetime) this.send(`go movetime ${opts.movetime}`)
      else this.send(`go depth ${opts.depth ?? 10}`)
      const bestLine = await done
      this.listeners.delete(onInfo)

      const best = bestLine.split(' ')[1]
      const candidates = [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c)
      return { best, candidates }
    }
    const p = this.queue.then(run, run)
    this.queue = p.catch(() => undefined)
    return p
  }
}

export const engine = new Engine()
