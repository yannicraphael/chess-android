import { Chess, type Move } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import Board, { type Arrow, type SquarePair } from '../components/Board'
import Icon from '../components/Icon'
import type { Opening } from '../data/openings'
import { de } from '../lib/chessText'
import { playSound } from '../lib/sound'

function moveSound(m: Move, chess: Chess) {
  if (chess.inCheck()) playSound('check')
  else if (m.captured) playSound('capture')
  else if (m.san.startsWith('O-O')) playSound('castle')
  else playSound('move')
}

const clean = (san: string) => san.replace(/[+#]/g, '')

// Trains an opening line move by move.
// Level 1 shows every move with an arrow and explanation, level 2 lets the player move with an
// optional hint, level 3 plays all lines without help. Score passed to onFinish = stars (1-3).
export default function OpeningTrainer({ opening, level, onFinish }: {
  opening: Opening
  level: number
  onFinish: (stars: number) => void
}) {
  // level 3 runs through all lines, the others use the main line (level 2: a random line)
  const [order] = useState(() => {
    if (level === 3) return opening.lines.map((_, i) => i)
    if (level === 2) return [Math.floor(Math.random() * opening.lines.length)]
    return [0]
  })
  const [lineNo, setLineNo] = useState(0)
  const line = opening.lines[order[lineNo]]
  const moves = line.moves.split(' ')
  const chessRef = useRef(new Chess())
  const chess = chessRef.current
  const [fen, setFen] = useState(chess.fen())
  const [ply, setPly] = useState(0)
  const [last, setLast] = useState<SquarePair | null>(null)
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [mistakes, setMistakes] = useState(0)
  const [tries, setTries] = useState(0) // wrong tries on the current move
  const [showHint, setShowHint] = useState(false)
  const [note, setNote] = useState<{ text: string; tone: '' | 'good' | 'bad' }>({ text: '', tone: '' })
  const [done, setDone] = useState(false)
  const timers = useRef<number[]>([])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const side = opening.side
  const myTurn = !done && ply < moves.length && (ply % 2 === 0 ? 'w' : 'b') === side

  function explain(p: number) {
    if (level === 3) return ''
    return line.notes?.[p] ?? ''
  }

  function play(san: string) {
    const m = chess.move(san)
    moveSound(m, chess)
    setFen(chess.fen())
    setLast({ from: m.from, to: m.to })
    return m
  }

  function lineFinished() {
    if (lineNo + 1 < order.length) {
      setNote({ text: `Variante „${line.name}“ geschafft. Jetzt die nächste.`, tone: 'good' })
      later(() => {
        chess.reset()
        setFen(chess.fen())
        setLast(null)
        setMarks({})
        setPly(0)
        setLineNo(lineNo + 1)
        setNote({ text: '', tone: '' })
      }, 1400)
      return
    }
    setDone(true)
    playSound('correct')
    const stars = level === 1 ? 3 : mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
    setNote({ text: level === 1 ? 'Geschafft! Du kennst jetzt die Hauptvariante.' : mistakes === 0 ? 'Fehlerfrei, ausgezeichnet!' : `Geschafft, mit ${mistakes} ${mistakes === 1 ? 'Fehler' : 'Fehlern'}.`, tone: 'good' })
    later(() => onFinish(stars), 900)
  }

  // the opponent's moves are played automatically
  useEffect(() => {
    if (done || ply >= moves.length) return
    const turn = ply % 2 === 0 ? 'w' : 'b'
    if (turn === side) return
    later(() => {
      play(moves[ply])
      const text = explain(ply)
      if (text) setNote({ text: `${de(chess.history().slice(-1)[0])}: ${text}`, tone: '' })
      const next = ply + 1
      setPly(next)
      if (next >= moves.length) lineFinished()
    }, ply === 0 ? 700 : 650)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply, lineNo, done])

  function onMove(from: string, to: string, promotion?: string) {
    if (!myTurn) return
    let m: Move
    try { m = chess.move({ from, to, promotion }) } catch { return }
    const expected = moves[ply]
    if (clean(m.san) === clean(expected)) {
      moveSound(m, chess)
      setFen(chess.fen())
      setLast({ from: m.from, to: m.to })
      setMarks({ [m.to]: 'mark-good' })
      setShowHint(false)
      setTries(0)
      const text = explain(ply)
      setNote({ text: text ? `${de(m.san)}: ${text}` : `${de(m.san)}, richtig!`, tone: 'good' })
      later(() => setMarks({}), 500)
      const next = ply + 1
      setPly(next)
      if (next >= moves.length) lineFinished()
    } else {
      chess.undo()
      playSound('wrong')
      setMarks({ [to]: 'mark-bad' })
      setMistakes((n) => n + 1)
      setTries((t) => t + 1)
      if (level === 2 || tries >= 1) setShowHint(true)
      setNote({ text: level === 3 && tries < 1 ? 'Das ist nicht der Zug aus der Variante. Versuch es nochmal.' : 'Nicht ganz. Der Pfeil zeigt dir den richtigen Zug.', tone: 'bad' })
      later(() => setMarks({}), 600)
    }
  }

  // arrow for the next move: always in level 1, on request or after a mistake otherwise
  let arrows: Arrow[] = []
  if (myTurn && (level === 1 || showHint)) {
    const probe = new Chess(fen)
    const m = probe.move(moves[ply])
    arrows = [{ from: m.from, to: m.to }]
  }

  const myMoves = Math.ceil(moves.filter((_, i) => (i % 2 === 0 ? 'w' : 'b') === side).length)
  const myDone = moves.slice(0, ply).filter((_, i) => (i % 2 === 0 ? 'w' : 'b') === side).length

  let prompt: string
  if (done) prompt = note.text
  else if (note.text) prompt = note.text
  else if (myTurn) prompt = level === 1 ? 'Spiele den Zug, den der Pfeil zeigt.' : 'Welcher Zug kommt jetzt?'
  else prompt = 'Der Gegner zieht…'

  return (
    <div className="puzzle-player opening-trainer">
      <div className="ot-head">
        <strong>{line.name}</strong>
        <span>{opening.first}{order.length > 1 ? ` · Variante ${lineNo + 1} von ${order.length}` : ''}</span>
      </div>
      <div className="ot-progress" aria-label={`${myDone} von ${myMoves} Zügen`}>
        {Array.from({ length: myMoves }, (_, i) => <span key={i} className={i < myDone ? 'on' : ''} />)}
      </div>
      <Board fen={fen} orientation={side} movableColor={myTurn ? side : null} lastMove={last} marks={marks} arrows={arrows} onMove={onMove} />
      <div className={'puzzle-status ' + note.tone}>
        <span className={'turn-dot ' + side} />
        <span className="puzzle-text">{prompt}</span>
      </div>
      {level === 2 && !done && (
        <div className="puzzle-tools">
          <button className="btn secondary small" onClick={() => { setShowHint(true); setMistakes((n) => n + 1) }} disabled={!myTurn || showHint}><Icon name="bulb" /> Tipp</button>
        </div>
      )}
    </div>
  )
}
