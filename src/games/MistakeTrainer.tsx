import { Chess, type Color, type Move } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import Board, { type Arrow, type SquarePair } from '../components/Board'
import Icon from '../components/Icon'
import { evaluate } from '../engine/stockfish'
import { dueMistakes, markMistake, mistakeMotif, type MistakePuzzle } from '../lib/archive'
import { MOTIF_LABELS, type Motif } from '../lib/explain'
import { de, uciToSan } from '../lib/chessText'
import { addXp, recordDaily } from '../lib/progress'
import { playSound } from '../lib/sound'
import { useBack } from '../lib/back'

type Status = 'play' | 'checking' | 'solved' | 'wrong' | 'shown'

// Positions from the player's own games where a clearly better move existed.
export default function MistakeTrainer({ onExit }: { onExit: () => void }) {
  const [all] = useState<MistakePuzzle[]>(() => dueMistakes())
  const [filter, setFilter] = useState<Motif | 'alle'>('alle')
  const queue = filter === 'alle' ? all : all.filter((m) => mistakeMotif(m) === filter)
  const [i, setI] = useState(0)
  const pz = queue[i]
  const [fen, setFen] = useState(pz?.fen ?? '')
  const counts = new Map<Motif, number>()
  for (const m of all) counts.set(mistakeMotif(m), (counts.get(mistakeMotif(m)) ?? 0) + 1)
  const groups = (Object.keys(MOTIF_LABELS) as Motif[]).filter((k) => counts.get(k))

  function choose(f: Motif | 'alle') {
    const q = f === 'alle' ? all : all.filter((m) => mistakeMotif(m) === f)
    setFilter(f)
    setI(0)
    setFen(q[0]?.fen ?? '')
    setLast(null)
    setArrow(null)
    setStatus('play')
    setMsg('')
  }

  const chips = groups.length > 1 && (
    <div className="motif-chips" role="tablist">
      <button className={'chip' + (filter === 'alle' ? ' active' : '')} onClick={() => choose('alle')}>Alle {all.length}</button>
      {groups.map((g) => (
        <button key={g} className={'chip' + (filter === g ? ' active' : '')} onClick={() => choose(g)}>{MOTIF_LABELS[g]} {counts.get(g)}</button>
      ))}
    </div>
  )
  const [last, setLast] = useState<SquarePair | null>(null)
  const [status, setStatus] = useState<Status>('play')
  const [arrow, setArrow] = useState<Arrow | null>(null)
  const [msg, setMsg] = useState('')
  const [solvedCount, setSolvedCount] = useState(0)
  const alive = useRef(true)
  useBack(onExit)
  useEffect(() => () => { alive.current = false }, [])

  if (!pz) {
    return (
      <div className="training-play">
        <header className="game-header">
          <button className="icon-btn" onClick={onExit} aria-label="Zurück"><Icon name="back" /></button>
          <div className="game-title">Eigene Fehler</div>
          <span style={{ width: 44 }} />
        </header>
        {filter !== 'alle' && chips}
        <div className="empty-state">
          <Icon name="check" />
          <h2>{filter !== 'alle' ? 'Diese Gruppe ist erledigt' : solvedCount > 0 ? 'Alle Fehler aufgearbeitet!' : 'Gerade nichts zu wiederholen'}</h2>
          <p>Nach jeder Partie analysiert die Engine deine Züge. Klare Fehler landen hier als Aufgaben. Gelöste Stellungen kommen nach einigen Tagen noch einmal, damit du sie dir wirklich merkst.</p>
          <button className="btn primary" onClick={onExit}>Zurück</button>
        </div>
      </div>
    )
  }

  const side = pz.fen.split(' ')[1] as Color

  function markSolved() {
    markMistake(pz.id, true)
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
      setMsg(alt ? `Auch stark! Die Engine hätte ${uciToSan(pz.fen, pz.best)} gespielt.` : 'Richtig! Diesmal hättest du es gefunden.' + (pz.why ? ` In der Partie: ${pz.why}` : ''))
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
    markMistake(pz.id, false)
    setMsg(pz.why || `Besser war ${uciToSan(pz.fen, pz.best)}.`)
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
        {chips}
        <div className="ot-head">
          <strong>Gegen {pz.opponent}{(pz.count ?? 1) > 1 && <span className="mistake-count">{pz.count}× falsch gespielt</span>}</strong>
          <span>{MOTIF_LABELS[mistakeMotif(pz)]} · Du hast hier {de(pz.played)} gespielt. Finde einen besseren Zug.{pz.box ? ' (Wiederholung)' : ''}</span>
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
