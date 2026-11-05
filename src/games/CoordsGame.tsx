import Icon from '../components/Icon'
import type { Color } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import Board from '../components/Board'
import { playSound } from '../lib/sound'
import type { GameLevel } from './levels'

const FILES = 'abcdefgh'
const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1'
const DURATION = 30

function randomSquare(not?: string) {
  let sq: string
  do sq = FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8))
  while (sq === not)
  return sq
}

export default function CoordsGame({ level, onFinish }: { level: GameLevel; onFinish: (score: number) => void }) {
  const [running, setRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [target, setTarget] = useState(() => randomSquare())
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [flash, setFlash] = useState<Record<string, string>>({})
  const [orientation, setOrientation] = useState<Color>(level.n === 3 ? 'b' : 'w')
  const scoreRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id)
          setRunning(false)
          onFinish(scoreRef.current)
          return 0
        }
        if (t <= 6) playSound('tick')
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, onFinish])

  function tap(sq: string) {
    if (!running) return
    if (sq === target) {
      playSound('correct')
      scoreRef.current += 1
      setScore(scoreRef.current)
      setCombo((c) => c + 1)
      setFlash({ [sq]: 'mark-good' })
      setTarget(randomSquare(sq))
      if (level.n === 4) setOrientation(Math.random() < 0.5 ? 'w' : 'b')
    } else {
      playSound('wrong')
      setCombo(0)
      setFlash({ [sq]: 'mark-bad' })
    }
    setTimeout(() => setFlash({}), 250)
  }

  return (
    <div className="minigame">
      <div className="mg-hud">
        <div className="mg-stat"><Icon name="clock" />{timeLeft}s</div>
        <div className="mg-target">{running ? target : '—'}</div>
        <div className="mg-stat"><Icon name="check" />{score}{combo >= 5 && <em className="combo"><Icon name="flame" />{combo}</em>}</div>
      </div>
      <Board fen={EMPTY} orientation={orientation} showCoords={level.n === 1} marks={flash} onSquareTap={tap} />
      {!running && timeLeft === DURATION && (
        <div className="mg-start">
          <p>Ein Feld wird oben angezeigt. Tippe es so schnell wie möglich an.</p>
          <button className="btn primary big" onClick={() => { setRunning(true); playSound('move') }}>Los geht's</button>
        </div>
      )}
    </div>
  )
}
