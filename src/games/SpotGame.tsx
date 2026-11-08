import { t } from '../i18n'
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import Board, { type SquarePair } from '../components/Board'
import Icon from '../components/Icon'
import { recordDaily } from '../lib/progress'
import { loadPuzzles, type Puzzle } from '../lib/puzzles'
import { playSound } from '../lib/sound'
import type { GameLevel } from './levels'

// Two quick-pattern games against the clock, built from positions of the puzzle database:
// "hanging": capture the piece that is attacked and not defended,
// "mate1": find the mate in one move.

export type SpotMode = 'hanging' | 'mate1'

interface Task { fen: string; rating: number; targets: string[] } // targets: squares of the hanging pieces

const VAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const LIVES = 3

function applyMoves(fen: string, moves: string[]) {
  const c = new Chess(fen)
  for (const u of moves) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
  return c
}

function hangingPieces(c: Chess, minValue: number) {
  const me = c.turn()
  const opp: Color = me === 'w' ? 'b' : 'w'
  const out: string[] = []
  for (const row of c.board()) for (const p of row) {
    if (!p || p.color !== opp || p.type === 'k' || VAL[p.type] < minValue) continue
    if (c.isAttacked(p.square, me) && !c.isAttacked(p.square, opp)) out.push(p.square)
  }
  return out
}

const pools = new Map<string, Task[]>()

function buildPool(list: Puzzle[], mode: SpotMode, minValue: number): Task[] {
  const key = `${mode}-${minValue}`
  const cached = pools.get(key)
  if (cached) return cached
  const out: Task[] = []
  // scanning every position is slow on a phone: mate tasks only look at mate puzzles,
  // hanging pieces at an evenly spread sample of the database
  const base = mode === 'mate1' ? list.filter((p) => /mateIn[123]\b/.test(p.themes)) : list
  const step = Math.max(1, Math.floor(base.length / 2500))
  const source = base.filter((_, i) => i % step === 0)
  for (const p of source) {
    const moves = p.moves.split(' ')
    try {
      if (mode === 'mate1') {
        // mate in 1, or the last step of a longer mate (position before the final move)
        if (!/mateIn[123]\b/.test(p.themes)) continue
        const c = applyMoves(p.fen, moves.slice(0, -1))
        const probe = new Chess(c.fen())
        const last = moves[moves.length - 1]
        probe.move({ from: last.slice(0, 2), to: last.slice(2, 4), promotion: last[4] })
        if (probe.isCheckmate()) out.push({ fen: c.fen(), rating: p.rating, targets: [] })
      } else {
        const c = applyMoves(p.fen, moves.slice(0, 1))
        if (c.inCheck()) continue
        const big = hangingPieces(c, 3)
        const all = hangingPieces(c, minValue)
        if (all.length === 1 && (minValue === 1 || big.length === 1)) out.push({ fen: c.fen(), rating: p.rating, targets: all })
      }
    } catch { /* skip broken lines */ }
  }
  pools.set(key, out)
  return out
}

export default function SpotGame({ mode, level, onFinish }: { mode: SpotMode; level: GameLevel; onFinish: (score: number) => void }) {
  const seconds = level.seconds ?? 60
  const [pool, setPool] = useState<Task[] | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [fen, setFen] = useState('')
  const [last, setLast] = useState<SquarePair | null>(null)
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [started, setStarted] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const used = useRef(new Set<string>())
  const finished = useRef(false)
  const scoreRef = useRef(0)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    loadPuzzles().then((list) => {
      const all = buildPool(list, mode, level.n >= 3 && mode === 'hanging' ? 1 : 3)
      // level 1: easier positions, level 3: harder ones
      const filtered = level.n === 1 ? all.filter((t) => t.rating <= 1300) : level.n === 3 && mode === 'mate1' ? all.filter((t) => t.rating >= 1000) : all
      setPool(filtered.length >= 20 ? filtered : all)
    })
  }, [mode, level.n])

  function pick(p: Task[]) {
    let free = p.filter((t) => !used.current.has(t.fen))
    if (!free.length) { used.current.clear(); free = p }
    const t = free[Math.floor(Math.random() * free.length)]
    used.current.add(t.fen)
    setTask(t)
    setFen(t.fen)
    setLast(null)
    setMarks({})
    setBusy(false)
  }

  function begin() {
    if (!pool?.length) return
    setStarted(Date.now())
    pick(pool)
  }

  function end() {
    if (finished.current) return
    finished.current = true
    onFinish(scoreRef.current)
  }

  useEffect(() => {
    if (!started) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [started])

  const left = started ? Math.max(0, seconds - Math.floor((now - started) / 1000)) : seconds
  useEffect(() => {
    if (started && left === 0) end()
    if (started && left <= 5 && left > 0) playSound('tick')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, started])

  function onMove(from: string, to: string, promotion?: string) {
    if (!task || busy || finished.current) return
    const c = new Chess(task.fen)
    let m: Move
    try { m = c.move({ from, to, promotion }) } catch { return }
    setFen(c.fen())
    setLast({ from: m.from, to: m.to })
    setBusy(true)
    const ok = mode === 'mate1' ? c.isCheckmate() : task.targets.includes(m.to) && Boolean(m.captured)
    if (ok) {
      playSound(mode === 'mate1' ? 'check' : 'capture')
      timers.current.push(window.setTimeout(() => playSound('correct'), 120))
      setMarks({ [m.to]: 'mark-good' })
      scoreRef.current++
      setScore(scoreRef.current)
      recordDaily('puzzle')
      timers.current.push(window.setTimeout(() => { if (!finished.current && pool) pick(pool) }, 500))
    } else {
      playSound('wrong')
      // show the solution
      const solution: Record<string, string> = { [m.to]: 'mark-bad' }
      if (mode === 'hanging') for (const sq of task.targets) solution[sq] = 'mark-good'
      else {
        const mate = new Chess(task.fen).moves({ verbose: true }).find((x) => { const p = new Chess(task.fen); p.move(x.san); return p.isCheckmate() })
        if (mate) { solution[mate.from] = 'mark-good'; solution[mate.to as Square] = 'mark-good' }
      }
      setMarks(solution)
      const l = lives - 1
      setLives(l)
      timers.current.push(window.setTimeout(() => {
        if (l <= 0) { end(); return }
        if (!finished.current && pool) pick(pool)
      }, 1500))
    }
  }

  const side = (task?.fen.split(' ')[1] ?? 'w') as Color
  const title = mode === 'mate1' ? t('Matt in einem Zug') : t('Hängende Figur')
  const rule = mode === 'mate1'
    ? t('Setze mit einem Zug matt.')
    : level.n >= 3 ? t('Schlage die Figur, die nicht gedeckt ist. Auch Bauern zählen.') : t('Eine gegnerische Figur ist angegriffen und nicht gedeckt. Schlage sie.')

  return (
    <div className="minigame spot-game">
      <div className="mg-hud">
        <div className="mg-stat">{Array.from({ length: LIVES }, (_, k) => <span key={k} className={'life' + (k < lives ? '' : ' lost')}><Icon name="heart" fill /></span>)}</div>
        <div className="mg-target small">{score}<small>{t('gefunden')}</small></div>
        <div className={'mg-stat' + (left <= 10 && started ? ' hurry' : '')}><Icon name="clock" />{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>
      </div>
      {task
        ? (
          <>
            <Board fen={fen} orientation={side} movableColor={busy ? null : side} lastMove={last} marks={marks} onMove={onMove} />
            <div className="puzzle-status">
              <span className={'turn-dot ' + side} />
              <span className="puzzle-text">{side === 'w' ? t('Weiß am Zug.') : t('Schwarz am Zug.')} {rule}</span>
            </div>
          </>
        )
        : (
          <div className="mg-start static">
            <h2>{title}</h2>
            <p>{rule} {t('{s} Sekunden Zeit, {lives} Leben.', { s: seconds, lives: LIVES })}</p>
            <button className="btn primary big" onClick={begin} disabled={!pool}>{pool ? t('Los geht’s') : t('Lädt…')}</button>
          </div>
        )}
    </div>
  )
}
