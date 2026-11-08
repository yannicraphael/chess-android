import { t } from '../i18n'
import { Chess, type Move } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import Board, { type Arrow, type SquarePair } from '../components/Board'
import Icon from '../components/Icon'
import type { Opening } from '../data/openings'
import { OPENING_THEORY } from '../data/openingTheory'
import { OpeningTheoryPage } from '../screens/TheoryPage'
import { notate, moveText } from '../lib/chessText'
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
  const [order, setOrder] = useState(() => {
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
  const [errors, setErrors] = useState<string[]>([]) // wrong moves, e.g. "7.c3 statt 7.Te1"
  const [tries, setTries] = useState(0) // wrong tries on the current move
  const [showHint, setShowHint] = useState(false)
  const [note, setNote] = useState<{ text: string; tone: '' | 'good' | 'bad' }>({ text: '', tone: '' })
  const [done, setDone] = useState(false)
  const [theory, setTheory] = useState(false) // the theory page is open
  const [ideaShown, setIdeaShown] = useState(false) // level 2: the idea of the current move was shown
  const timers = useRef<number[]>([])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const side = opening.side
  const myTurn = !done && ply < moves.length && (ply % 2 === 0 ? 'w' : 'b') === side

  const theoryData = OPENING_THEORY[opening.id]
  const lineIdea = theoryData?.lineIdeas[order[lineNo]] ?? ''
  // the ply where this line leaves the main line (the opponent plays something else)
  const mainMoves = opening.lines[0].moves.split(' ')
  const branchPly = order[lineNo] === 0 ? -1 : moves.findIndex((m, i) => m !== mainMoves[i])

  function noteFor(p: number) {
    return theoryData?.notes[order[lineNo]]?.[p] ?? line.notes?.[p] ?? ''
  }

  // level 1 explains every move, level 2 and 3 only on request or after mistakes
  function explain(p: number) {
    return level === 1 ? noteFor(p) : ''
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
      setNote({ text: t('Variante „{name}“ geschafft. Jetzt die nächste.', { name: line.name }), tone: 'good' })
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
    const list = errors.length ? `\n${t('Gezählt:')} ${errors.join(', ')}` : ''
    setNote({ text: level === 1 ? t('Geschafft! Du kennst jetzt die Hauptvariante.') : mistakes === 0 ? t('Fehlerfrei, ausgezeichnet!') : (mistakes === 1 ? t('Geschafft, mit 1 Fehler.') : t('Geschafft, mit {n} Fehlern.', { n: mistakes })) + list, tone: 'good' })
    later(() => onFinish(stars), 900)
  }

  // the opponent's moves are played automatically
  useEffect(() => {
    if (done || theory || ply >= moves.length) return
    const turn = ply % 2 === 0 ? 'w' : 'b'
    if (turn === side) return
    const id = window.setTimeout(() => {
      play(moves[ply])
      const branch = ply === branchPly && level < 3 ? t('Hier weicht der Gegner von der Hauptvariante ab.') + ' ' : ''
      const text = explain(ply) || (branch && level === 2 ? t('Variante „{name}“.', { name: line.name }) : '')
      if (text) {
        const line2 = `${notate(chess.history().slice(-1)[0])}: ${branch}${text}`
        // keep the explanation of the player's own move above the reply
        setNote((n) => ({ text: n.tone === 'good' && n.text ? `${n.text}\n${line2}` : line2, tone: '' }))
      }
      const next = ply + 1
      setPly(next)
      if (next >= moves.length) lineFinished()
    }, ply === 0 ? 700 : 650)
    // a pending reply is cancelled when the theory page opens, so it is never played twice
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply, lineNo, done, theory])

  function onMove(from: string, to: string, promotion?: string) {
    if (!myTurn) return
    let m: Move
    try { m = chess.move({ from, to, promotion }) } catch { return }
    let expected = moves[ply]
    // another line of this opening may continue differently from the same position
    // (Spanish: 4.La4 or 4.Lxc6). Such a book move counts as correct and switches to that line.
    if (clean(m.san) !== clean(expected)) {
      const j = opening.lines.findIndex((l, k) => {
        if (k === order[lineNo]) return false
        const ms = l.moves.split(' ')
        return ms.slice(0, ply).join(' ') === moves.slice(0, ply).join(' ') && clean(ms[ply] ?? '') === clean(m.san)
      })
      const pos = order.indexOf(j, lineNo + 1)
      if (j >= 0 && (pos >= 0 || !order.includes(j))) {
        const next = [...order]
        if (pos >= 0) next[pos] = order[lineNo]
        next[lineNo] = j
        setOrder(next)
        expected = opening.lines[j].moves.split(' ')[ply]
      }
    }
    if (clean(m.san) === clean(expected)) {
      moveSound(m, chess)
      setFen(chess.fen())
      setLast({ from: m.from, to: m.to })
      setMarks({ [m.to]: 'mark-good' })
      setShowHint(false)
      setIdeaShown(false)
      setTries(0)
      const text = explain(ply)
      setNote({ text: text ? `${notate(m.san)}: ${text}` : t('{san}, richtig!', { san: notate(m.san) }), tone: 'good' })
      later(() => setMarks({}), 500)
      const next = ply + 1
      setPly(next)
      if (next >= moves.length) lineFinished()
    } else {
      chess.undo()
      playSound('wrong')
      setMarks({ [to]: 'mark-bad' })
      later(() => setMarks({}), 600)
      // a move of this line that only comes later (another move order) is not counted as a mistake
      const mine = (i: number) => (i % 2 === 0 ? 'w' : 'b') === side
      if (moves.some((s2, i) => i > ply && mine(i) && clean(s2) === clean(m.san))) {
        setNote({ text: t('{san} kommt in dieser Variante etwas später. Was spielst du davor?', { san: notate(m.san) }), tone: 'bad' })
        return
      }
      setMistakes((n) => n + 1)
      setErrors((e) => [...e, t('{a} statt {b}', { a: moveText([m.san], ply), b: moveText([expected], ply) })])
      setTries((t) => t + 1)
      // level 1: idea and arrow at once. Level 2: try again, then the idea, then the arrow.
      // Level 3: try again, then only the arrow (without explanation).
      const idea = noteFor(ply)
      const n = tries + 1
      let text: string
      if (level === 1) text = idea ? `${t('Nicht ganz. Die Idee:')} ${idea}` : t('Nicht ganz. Folge dem Pfeil.')
      else if (level === 2 && n === 1) text = t('Das ist nicht der Zug aus der Variante. Versuch es nochmal.')
      else if (level === 2 && n === 2 && idea) { text = `${t('Denk an die Idee:')} ${idea}`; setIdeaShown(true) }
      else if (level === 3 && n === 1) text = t('Das ist nicht der Zug aus der Variante. Versuch es nochmal.')
      else { text = t('Der Pfeil zeigt den richtigen Zug.'); setShowHint(true) }
      setNote({ text, tone: 'bad' })
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
  else if (myTurn) prompt = level === 1 ? t('Spiele den Zug, den der Pfeil zeigt.') : t('Welcher Zug kommt jetzt?')
  else prompt = t('Der Gegner zieht…')

  return (
    <div className="puzzle-player opening-trainer">
      <div className="ot-head">
        <div className="ot-title-row">
          <strong>{line.name}</strong>
          <button className="theory-link" onClick={() => setTheory(true)}><Icon name="book" /> {t('Theorie')}</button>
        </div>
        <span>{opening.first}{order.length > 1 ? ` · ${t('Variante {a} von {b}', { a: lineNo + 1, b: order.length })}` : ''}</span>
        {level === 1 && lineIdea && <small className="ot-idea">{lineIdea}</small>}
      </div>
      <div className="ot-progress" aria-label={t('{a} von {b} Zügen', { a: myDone, b: myMoves })}>
        {Array.from({ length: myMoves }, (_, i) => <span key={i} className={i < myDone ? 'on' : ''} />)}
      </div>
      <Board fen={fen} orientation={side} movableColor={myTurn ? side : null} lastMove={last} marks={marks} arrows={arrows} onMove={onMove} />
      <div className={'puzzle-status ' + note.tone}>
        <span className={'turn-dot ' + side} />
        <span className="puzzle-text">{prompt}</span>
      </div>
      {theory && <OpeningTheoryPage opening={opening} onClose={() => setTheory(false)} />}
      {level === 2 && !done && (
        <div className="puzzle-tools">
          <button className="btn secondary small" disabled={!myTurn || showHint} onClick={() => {
            // first the idea in words, then the arrow; each costs like a mistake
            setMistakes((n) => n + 1)
            setErrors((e) => [...e, t('Tipp')])
            const idea = noteFor(ply)
            if (!ideaShown && idea) { setIdeaShown(true); setNote({ text: `${t('Die Idee:')} ${idea}`, tone: '' }) }
            else { setShowHint(true); setNote({ text: t('Der Pfeil zeigt den Zug.'), tone: '' }) }
          }}><Icon name="bulb" /> {ideaShown ? t('Zug zeigen') : t('Tipp')}</button>
        </div>
      )}
    </div>
  )
}
