import Icon from '../components/Icon'
import { useEffect, useRef, useState } from 'react'
import { recordDaily } from '../lib/progress'
import { loadPuzzles, type Puzzle } from '../lib/puzzles'
import { playSound } from '../lib/sound'
import type { GameLevel } from './levels'
import PuzzlePlayer, { type PuzzleOutcome } from './PuzzlePlayer'

const LIVES = 3

// Puzzle sprint: solve as many puzzles as possible against the clock, three mistakes end the run.
// Puzzles get a little harder with every solved one.
export default function PuzzleSprint({ level, onFinish }: { level: GameLevel; onFinish: (score: number) => void }) {
  const seconds = level.seconds ?? 180
  const [list, setList] = useState<Puzzle[] | null>(null)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [run, setRun] = useState(0)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [started, setStarted] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const used = useRef(new Set<string>())
  const finished = useRef(false)
  const scoreRef = useRef(0)

  useEffect(() => { loadPuzzles().then(setList) }, [])

  function pick(l: Puzzle[], solved: number) {
    const target = (level.start ?? 600) + solved * 45
    let pool: Puzzle[] = []
    for (const r of [60, 120, 250, 600, 4000]) {
      pool = l.filter((p) => !used.current.has(p.id) && Math.abs(p.rating - target) <= r && p.moves.split(' ').length <= 6)
      if (pool.length) break
    }
    const p = pool[Math.floor(Math.random() * pool.length)]
    used.current.add(p.id)
    return p
  }

  function begin() {
    if (!list) return
    setStarted(Date.now())
    setPuzzle(pick(list, 0))
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
    if (started && left <= 10 && left > 0) playSound('tick')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, started])

  function onDone(o: PuzzleOutcome) {
    if (finished.current || !list) return
    if (o.mistakes === 0) {
      scoreRef.current++
      recordDaily('puzzle')
      setScore(scoreRef.current)
      setTimeout(() => { if (!finished.current) { setPuzzle(pick(list, scoreRef.current)); setRun((r) => r + 1) } }, 450)
    } else {
      const l = lives - 1
      setLives(l)
      setTimeout(() => {
        if (l <= 0) { end(); return }
        if (!finished.current) { setPuzzle(pick(list, scoreRef.current)); setRun((r) => r + 1) }
      }, 1300)
    }
  }

  return (
    <div className="minigame">
      <div className="mg-hud">
        <div className="mg-stat">{Array.from({ length: LIVES }, (_, k) => <span key={k} className={'life' + (k < lives ? '' : ' lost')}><Icon name="heart" fill /></span>)}</div>
        <div className="mg-target small">{score}<small>gelöst</small></div>
        <div className={'mg-stat' + (left <= 10 && started ? ' hurry' : '')}><Icon name="clock" />{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>
      </div>
      {puzzle
        ? <PuzzlePlayer key={run} puzzle={puzzle} stopOnMistake tools={false} onDone={onDone} />
        : (
          <div className="mg-start static">
            <h2>Taktik-Sprint</h2>
            <p>{Math.round(seconds / 60)} Minuten Zeit, {LIVES} Leben. Jede gelöste Aufgabe wird etwas schwerer.</p>
            <button className="btn primary big" onClick={begin} disabled={!list}>{list ? 'Los geht’s' : 'Lädt…'}</button>
          </div>
        )}
    </div>
  )
}
