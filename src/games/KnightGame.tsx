import { useEffect, useMemo, useRef, useState } from 'react'
import Board from '../components/Board'
import { playSound } from '../lib/sound'
import type { GameLevel } from './levels'

const FILES = 'abcdefgh'
const ROUNDS = 8
const JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]

const toXY = (sq: string) => [FILES.indexOf(sq[0]), Number(sq[1]) - 1]
const toSq = (x: number, y: number) => FILES[x] + (y + 1)

function knightMoves(sq: string) {
  const [x, y] = toXY(sq)
  return JUMPS.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && a < 8 && b >= 0 && b < 8).map(([a, b]) => toSq(a, b))
}

function distance(from: string, to: string) {
  const seen = new Map([[from, 0]])
  const queue = [from]
  while (queue.length) {
    const s = queue.shift()!
    if (s === to) return seen.get(s)!
    for (const n of knightMoves(s)) if (!seen.has(n)) { seen.set(n, seen.get(s)! + 1); queue.push(n) }
  }
  return 99
}

const RANGES: Record<number, [number, number]> = { 1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [4, 6] }

function newTask(level: number, start?: string) {
  const [lo, hi] = RANGES[level]
  for (;;) {
    const from = start ?? toSq(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8))
    const to = toSq(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8))
    const d = distance(from, to)
    if (d >= lo && d <= hi) return { from, to, optimal: d }
  }
}

const fenWithKnight = (sq: string) => {
  const [x, y] = toXY(sq)
  const rows: string[] = []
  for (let r = 7; r >= 0; r--) rows.push(r === y ? `${x ? x : ''}N${7 - x ? 7 - x : ''}` : '8')
  return rows.join('/') + ' w - - 0 1'
}

export default function KnightGame({ level, onFinish }: { level: GameLevel; onFinish: (score: number) => void }) {
  const [round, setRound] = useState(0)
  const [task, setTask] = useState(() => newTask(level.n))
  const [knight, setKnight] = useState(task.from)
  const [prev, setPrev] = useState<string | null>(null)
  const [jumps, setJumps] = useState(0)
  const [extra, setExtra] = useState(0)
  const [flash, setFlash] = useState<Record<string, string>>({})
  const [startTime] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const finished = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  const reachable = useMemo(() => knightMoves(knight), [knight])

  function tap(sq: string) {
    if (finished.current) return
    if (!reachable.includes(sq)) {
      playSound('wrong')
      setFlash({ [sq]: 'mark-bad' })
      setTimeout(() => setFlash({}), 250)
      return
    }
    playSound('move')
    setPrev(knight)
    setKnight(sq)
    const used = jumps + 1
    if (sq === task.to) {
      const over = used - task.optimal
      const totalExtra = extra + over
      setExtra(totalExtra)
      setTimeout(() => playSound(over === 0 ? 'correct' : 'tick'), 120)
      if (round + 1 >= ROUNDS) {
        finished.current = true
        // 3 stars: perfect, 2: at most 3 extra jumps, 1: finished
        const score = totalExtra === 0 ? 3 : totalExtra <= 3 ? 2 : 1
        setTimeout(() => onFinish(score), 500)
        return
      }
      setRound(round + 1)
      setJumps(0)
      const t = newTask(level.n, sq)
      setTask(t)
    } else {
      setJumps(used)
    }
  }

  const marks: Record<string, string> = { ...flash, [task.to]: 'mark-target' }
  if (level.n === 1) for (const r of reachable) if (!marks[r]) marks[r] = 'mark-path'

  return (
    <div className="minigame">
      <div className="mg-hud">
        <div className="mg-stat"><span>🏁</span>{round + 1}/{ROUNDS}</div>
        <div className="mg-target small">Ziel {task.to}<small>in {task.optimal} {task.optimal === 1 ? 'Sprung' : 'Sprüngen'}</small></div>
        <div className="mg-stat"><span>⏱</span>{Math.floor((now - startTime) / 1000)}s</div>
      </div>
      <Board fen={fenWithKnight(knight)} orientation="w" marks={marks} lastMove={prev ? { from: prev, to: knight } : null} onSquareTap={tap} />
      <p className="mg-info">Sprünge in dieser Runde: {jumps} · Umwege bisher: {extra}</p>
    </div>
  )
}
