import { Chess, type Color, type Move } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import Board, { type Arrow, type SquarePair } from '../components/Board'
import Icon from '../components/Icon'
import { evaluate } from '../engine/stockfish'
import { archive, type MistakePuzzle } from '../lib/archive'
import { de, uciToSan } from '../lib/chessText'
import { addXp, recordDaily } from '../lib/progress'
import { playSound } from '../lib/sound'

type Status = 'play' | 'checking' | 'solved' | 'wrong' | 'shown'

// Positions from the player's own games where a clearly better move existed.
export default function MistakeTrainer({ onExit }: { onExit: () => void }) {
  const [queue] = useState<MistakePuzzle[]>(() => archive.get().mistakes.filter((m) => !m.solved))
  const [i, setI] = useState(0)
  const pz = queue[i]
  const [fen, setFen] = useState(pz?.fen ?? '')
  const [last, setLast] = useState<SquarePair | null>(null)
  const [status, setStatus] = useState<Status>('play')
  const [arrow, setArrow] = useState<Arrow | null>(null)
  const [msg, setMsg] = useState('')
  const [solvedCount, setSolvedCount] = useState(0)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  if (!pz) {
    return (
      <div className="training-play">
        <header className="game-header">
          <button className="icon-btn" onClick={onExit} aria-label="Zurück"><Icon name="back" /></button>
          <div className="game-title">Eigene Fehler</div>
          <span style={{ width: 44 }} />
        </header>
        <div className="empty-state">
          <Icon name="check" />
          <h2>{solvedCount > 0 ? 'Alle Fehler aufgearbeitet!' : 'Noch keine Fehler gesammelt'}</h2>
          <p>Nach jeder Partie analysiert die Engine deine Züge. Klare Fehler landen hier als Aufgaben, damit du sie beim nächsten Mal findest.</p>
          <button className="btn primary" onClick={onExit}>Zurück</button>
        </div>
      </div>
    )
  }

  const side = pz.fen.split(' ')[1] as Color

  function markSolved() {
    archive.set((s) => ({ mistakes: s.mistakes.map((m) => (m.id === pz.id ? { ...m, solved: true } : m)) }))
    setSolvedCount((n) => n + 1)
    recordDaily('puzzle')
    addXp(8)
  }

  async function onMove(from: string, to: string, promotion?: string) {
    if (status !== 'play' && status !== 'wrong') return
    const c = new Chess(pz.fen)
    let m: Move
    try { m = c.move({ from, to, promotion }) } catch { return }
    setFen(c.fen())
    setLast({ from: m.from, to: m.to })
    playSound(m.captured ? 'capture' : 'move')
    const uci = m.from + m.to + (m.promotion ?? '')
    let good = uci === pz.best || c.isCheckmate()
    let alt = false
    if (!good) {
      setStatus('checking')
      const e = await evaluate(c.fen(), 12)
      if (!alive.current) return
      const mine = -e.bestCp
      if (pz.bestCp - mine <= 60) { good = true; alt = true }
    }
    if (good) {
      playSound('correct')
      setStatus('solved')
      setArrow(null)
      setMsg(alt ? `Auch stark! Die Engine hätte ${uciToSan(pz.fen, pz.best)} gespielt.` : 'Richtig! Diesmal hättest du es gefunden.')
      markSolved()
    } else {
      playSound('wrong')
      setStatus('wrong')
      setMsg('Nicht besser als in der Partie. Versuch es nochmal.')
      window.setTimeout(() => { if (alive.current) { setFen(pz.fen); setLast(null) } }, 700)
    }
  }

  function reveal() {
    setArrow({ from: pz.best.slice(0, 2), to: pz.best.slice(2, 4), color: 'info' })
    setStatus('shown')
    setMsg(`Besser war ${uciToSan(pz.fen, pz.best)}.`)
  }

  function next() {
    const n = i + 1
    setI(n)
    const p = queue[n]
    if (p) setFen(p.fen)
    setLast(null)
    setArrow(null)
    setStatus('play')
    setMsg('')
  }

  const done = status === 'solved' || status === 'shown'
  const tone = status === 'solved' ? 'good' : status === 'wrong' ? 'bad' : ''

  return (
    <div className="training-play">
      <header className="game-header">
        <button className="icon-btn" onClick={onExit} aria-label="Zurück"><Icon name="back" /></button>
        <div className="game-title">Eigene Fehler · {i + 1}/{queue.length}</div>
        <span style={{ width: 44 }} />
      </header>
      <div className="puzzle-player">
        <div className="ot-head">
          <strong>Gegen {pz.opponent}</strong>
          <span>Du hast hier {de(pz.played)} gespielt. Finde einen besseren Zug.</span>
        </div>
        <Board fen={fen} orientation={side} movableColor={done || status === 'checking' ? null : side} lastMove={last} arrows={arrow ? [arrow] : []} onMove={onMove} />
        <div className={'puzzle-status ' + tone}>
          <span className={'turn-dot ' + side} />
          <span className="puzzle-text">{status === 'checking' ? 'Die Engine prüft deinen Zug…' : msg || `${side === 'w' ? 'Weiß' : 'Schwarz'} am Zug.`}</span>
        </div>
        <div className="puzzle-tools">
          {done
            ? <button className="btn primary small" onClick={next}>{i + 1 < queue.length ? 'Nächster Fehler' : 'Fertig'} <Icon name="next" /></button>
            : <button className="btn secondary small" onClick={reveal} disabled={status === 'checking'}><Icon name="eye" /> Lösung</button>}
        </div>
      </div>
    </div>
  )
}
