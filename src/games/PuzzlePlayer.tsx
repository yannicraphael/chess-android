import Icon from '../components/Icon'
import { Chess, type Color, type Move } from 'chess.js'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Board, { type SquarePair } from '../components/Board'
import { de } from '../lib/chessText'
import type { Puzzle } from '../lib/puzzles'
import { playSound } from '../lib/sound'

export interface PuzzleOutcome {
  clean: boolean // solved without mistakes, hints or revealing the solution
  mistakes: number
  hinted: boolean
  revealed: boolean
}

type Status = 'intro' | 'play' | 'reply' | 'flash' | 'wrong' | 'solved' | 'revealing' | 'revealed' | 'failed'

function moveSound(m: Move, chess: Chess) {
  if (chess.inCheck()) playSound('check')
  else if (m.promotion) playSound('promote')
  else if (m.captured) playSound('capture')
  else if (m.san.startsWith('O-O')) playSound('castle')
  else playSound('move')
}

const uciOf = (m: Move) => m.from + m.to + (m.promotion ?? '')

// Plays one puzzle on the board. The opponent's first move is shown automatically,
// then the player has to find every solving move.
export default function PuzzlePlayer({ puzzle, stopOnMistake = false, tools = true, onMistake, onDone, footer }: {
  puzzle: Puzzle
  stopOnMistake?: boolean // puzzle sprint: one wrong move ends the puzzle
  tools?: boolean // show hint and solution buttons
  onMistake?: () => void
  onDone: (o: PuzzleOutcome) => void
  footer?: ReactNode // shown once the puzzle is over (e.g. "Weiter")
}) {
  const moves = puzzle.moves.split(' ')
  const chessRef = useRef<Chess>(null as unknown as Chess)
  if (!chessRef.current) chessRef.current = new Chess(puzzle.fen)
  const chess = chessRef.current
  const solver: Color = puzzle.fen.split(' ')[1] === 'w' ? 'b' : 'w'

  const [fen, setFen] = useState(puzzle.fen)
  const [idx, setIdx] = useState(0) // index of the next move in `moves`
  const [status, setStatus] = useState<Status>('intro')
  const [last, setLast] = useState<SquarePair | null>(null)
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [hintLevel, setHintLevel] = useState(0)
  const [lastSan, setLastSan] = useState<string | null>(null)
  const stats = useRef({ mistakes: 0, hinted: false, revealed: false })
  const timers = useRef<number[]>([])
  const done = useRef(false)

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function play(uci: string) {
    const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    moveSound(m, chess)
    setFen(chess.fen())
    setLast({ from: m.from, to: m.to })
    setLastSan(m.san)
    return m
  }

  function finish(s: Status) {
    if (done.current) return
    done.current = true
    setStatus(s)
    const st = stats.current
    onDone({ clean: s === 'solved' && st.mistakes === 0 && !st.hinted, mistakes: st.mistakes, hinted: st.hinted, revealed: st.revealed })
  }

  // opponent's first move
  useEffect(() => {
    later(() => {
      play(moves[0])
      setIdx(1)
      setStatus('play')
    }, 650)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onMove(from: string, to: string, promotion?: string) {
    if (status !== 'play' && status !== 'wrong') return
    const expected = moves[idx]
    let m: Move
    try {
      m = chess.move({ from, to, promotion })
    } catch {
      return
    }
    // any checkmate counts as correct, even if the database solution is different
    const correct = uciOf(m) === expected || chess.isCheckmate()
    setFen(chess.fen())
    setLast({ from: m.from, to: m.to })
    setLastSan(m.san)
    setHintLevel(0)
    if (correct) {
      moveSound(m, chess)
      setMarks({ [m.to]: 'mark-good' })
      const next = idx + 1
      if (next >= moves.length || chess.isCheckmate()) {
        later(() => playSound('correct'), 150)
        setIdx(moves.length)
        finish('solved')
        return
      }
      setStatus('reply')
      later(() => {
        setMarks({})
        play(moves[next])
        setIdx(next + 1)
        setStatus('play')
      }, 500)
    } else {
      playSound('wrong')
      setMarks({ [m.to]: 'mark-bad' })
      stats.current.mistakes++
      onMistake?.()
      setStatus(stopOnMistake ? 'failed' : 'flash')
      if (stopOnMistake) {
        done.current = true
        const st = stats.current
        onDone({ clean: false, mistakes: st.mistakes, hinted: st.hinted, revealed: false })
        // show the correct move afterwards
        later(() => {
          chess.undo()
          setFen(chess.fen())
          const exp = moves[idx]
          setMarks({ [exp.slice(0, 2)]: 'mark-target', [exp.slice(2, 4)]: 'mark-good' })
          setLast(null)
        }, 550)
        return
      }
      later(() => {
        chess.undo()
        setFen(chess.fen())
        setMarks({})
        const h = chess.history({ verbose: true })
        const prev = h[h.length - 1]
        setLast(prev ? { from: prev.from, to: prev.to } : null)
        setLastSan(prev?.san ?? null)
        setStatus('wrong')
      }, 650)
    }
  }

  function hint() {
    if (status !== 'play' && status !== 'wrong') return
    stats.current.hinted = true
    setHintLevel((h) => Math.min(2, h + 1))
  }

  function reveal() {
    if (done.current || !(status === 'play' || status === 'wrong')) return
    stats.current.revealed = true
    setStatus('revealing')
    setHintLevel(0)
    let i = idx
    const step = () => {
      if (i >= moves.length) { finish('revealed'); return }
      setMarks({})
      play(moves[i])
      i++
      setIdx(i)
      later(step, 700)
    }
    later(step, 300)
  }

  const expected = moves[idx]
  const shownMarks = { ...marks }
  if (hintLevel >= 1 && expected && (status === 'play' || status === 'wrong')) shownMarks[expected.slice(0, 2)] = 'mark-target'
  const hintPair = hintLevel >= 2 && expected ? { from: expected.slice(0, 2), to: expected.slice(2, 4) } : null

  const side = solver === 'w' ? 'Weiß' : 'Schwarz'
  let text: ReactNode
  let tone = ''
  switch (status) {
    case 'intro': text = 'Der Gegner zieht…'; break
    case 'play': text = idx <= 1 ? <><strong>{side} am Zug.</strong> Finde den besten Zug!</> : <><strong>Richtig!</strong> Und weiter…</>; tone = idx <= 1 ? '' : 'good'; break
    case 'reply': text = <><strong>Richtig!</strong> {lastSan && de(lastSan)}</>; tone = 'good'; break
    case 'flash':
    case 'wrong': text = <><strong>Nicht ganz.</strong> Versuch es nochmal.</>; tone = 'bad'; break
    case 'failed': text = <><strong>Falsch.</strong> Richtig wäre der markierte Zug gewesen.</>; tone = 'bad'; break
    case 'solved': text = <><strong>Gelöst!</strong> {stats.current.mistakes === 0 && !stats.current.hinted ? 'Auf Anhieb, stark.' : 'Gut gemacht.'}</>; tone = 'good'; break
    case 'revealing': text = 'Lösung wird gezeigt…'; break
    case 'revealed': text = <><strong>So geht die Lösung.</strong> Schau sie dir in Ruhe an.</>; break
  }

  const over = status === 'solved' || status === 'failed' || status === 'revealed'

  return (
    <div className="puzzle-player">
      <Board
        fen={fen}
        orientation={solver}
        movableColor={status === 'play' || status === 'wrong' ? solver : null}
        lastMove={last}
        hint={hintPair}
        marks={shownMarks}
        onMove={onMove}
      />
      <div className={'puzzle-status ' + tone}>
        <span className={'turn-dot ' + solver} />
        <span className="puzzle-text">{text}</span>
      </div>
      {over ? footer : tools && (
        <div className="puzzle-tools">
          <button className="btn secondary small" onClick={hint} disabled={!(status === 'play' || status === 'wrong') || hintLevel >= 2}><Icon name="bulb" /> Tipp</button>
          <button className="btn secondary small" onClick={reveal} disabled={!(status === 'play' || status === 'wrong')}><Icon name="eye" /> Lösung</button>
        </div>
      )}
    </div>
  )
}
