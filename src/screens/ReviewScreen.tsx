import { L, t } from '../i18n'
import Icon from '../components/Icon'
import { Chess, type Color, type Move } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import Board from '../components/Board'
import { analyze, archive, performance, updateGame, type PosEval } from '../lib/archive'
import { notate, evalText, uciToSan } from '../lib/chessText'
import { explainMistake } from '../lib/explain'
import { playSound } from '../lib/sound'
import { useBack } from '../lib/back'
import './ReviewScreen.css'

type Grade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

const GRADES: Record<Grade, { label: string; icon: string; color: string }> = L({
  best: { label: 'Bester Zug', icon: '★', color: '#5fb85a' },
  good: { label: 'Gut', icon: '✓', color: '#8fbf6a' },
  inaccuracy: { label: 'Ungenauigkeit', icon: '?!', color: '#e8c33a' },
  mistake: { label: 'Fehler', icon: '?', color: '#e88a2e' },
  blunder: { label: 'Patzer', icon: '??', color: '#e0453a' },
})

// "1.e4 ist ein Fehler.": the rest of the sentence after the move
const GRADE_TEXT: Record<Grade, string> = L({
  best: 'ist der beste Zug.',
  good: 'ist gut.',
  inaccuracy: 'ist eine Ungenauigkeit.',
  mistake: 'ist ein Fehler.',
  blunder: 'ist ein Patzer.',
})

const winPct = (cp: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
const clip = (cp: number) => Math.max(-1000, Math.min(1000, cp))

export default function ReviewScreen({ history, playerColor, opponent, gameId, pgn, onClose }: {
  history: Move[]
  playerColor: Color
  opponent: string
  gameId?: string // archived game: its stored analysis is used and saved
  pgn?: string
  onClose: () => void
}) {
  const fens = useMemo(() => {
    const c = new Chess()
    const list = [c.fen()]
    for (const m of history) { c.move(m.san); list.push(c.fen()) }
    return list
  }, [history])

  const stored = gameId ? archive.get().games.find((g) => g.id === gameId)?.evals : undefined
  const [evals, setEvals] = useState<PosEval[]>(stored ?? [])
  const [progressN, setProgressN] = useState(stored ? fens.length : 0)
  const [ply, setPly] = useState(0)
  const [copied, setCopied] = useState(false)
  useBack(onClose)

  useEffect(() => {
    if (stored) return
    let cancelled = false
    const key = gameId ?? fens.join('|')
    analyze(key, fens, (n) => { if (!cancelled) setProgressN(n) }).then((ev) => {
      if (cancelled) return
      setEvals(ev)
      if (gameId) updateGame(gameId, { evals: ev })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fens])

  const done = evals.length === fens.length

  const graded = useMemo(() => {
    if (!done) return []
    return history.map((m, i) => {
      const sign = m.color === 'w' ? 1 : -1
      const before = clip(evals[i].cp) * sign
      const after = clip(evals[i + 1].cp) * sign
      const loss = Math.max(0, before - after)
      const wpLoss = Math.max(0, winPct(before) - winPct(after))
      const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * wpLoss) - 3.1669))
      const uci = m.from + m.to + (m.promotion ?? '')
      let grade: Grade
      if (evals[i].best === uci) grade = 'best'
      else if (loss < 50) grade = 'good'
      else if (loss < 100) grade = 'inaccuracy'
      else if (loss < 250) grade = 'mistake'
      else grade = 'blunder'
      return { move: m, grade, loss, accuracy, best: evals[i].best }
    })
  }, [done, evals, history])

  const summary = useMemo(() => {
    const acc = (c: Color) => {
      const list = graded.filter((g) => g.move.color === c)
      return list.length ? Math.round(list.reduce((s, g) => s + g.accuracy, 0) / list.length) : 0
    }
    const counts: Record<Grade, number> = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
    for (const g of graded) if (g.move.color === playerColor) counts[g.grade]++
    const perf = done ? performance(graded.map((g) => ({ ...g, uci: '', color: g.move.color })), playerColor) : null
    return { me: acc(playerColor), bot: acc(playerColor === 'w' ? 'b' : 'w'), counts, perf: perf?.perf ?? null }
  }, [graded, playerColor, done])

  const keyMoments = graded
    .map((g, i) => ({ ...g, ply: i + 1 }))
    .filter((g) => g.move.color === playerColor && (g.grade === 'mistake' || g.grade === 'blunder'))

  function go(p: number) {
    const n = Math.max(0, Math.min(fens.length - 1, p))
    if (n !== ply && n > 0) playSound(history[n - 1].captured ? 'capture' : 'move')
    setPly(n)
  }

  // eval graph
  const W = 320, H = 70
  const pts = evals.map((e, i) => {
    const x = fens.length > 1 ? (i / (fens.length - 1)) * W : 0
    const y = H - (winPct(clip(e.cp)) / 100) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = pts.length ? `M0,${H} L${pts.join(' L')} L${((evals.length - 1) / Math.max(1, fens.length - 1)) * W},${H} Z` : ''

  const current = ply > 0 && done ? graded[ply - 1] : null
  const lastMove = ply > 0 ? { from: history[ply - 1].from, to: history[ply - 1].to } : null
  const bestPrev = current && current.grade !== 'best' && current.best ? { from: current.best.slice(0, 2), to: current.best.slice(2, 4) } : null
  const evalNow = evals[ply]
  const why = current && (current.grade === 'inaccuracy' || current.grade === 'mistake' || current.grade === 'blunder')
    ? explainMistake({
      fenBefore: fens[ply - 1], played: current.move.from + current.move.to + (current.move.promotion ?? ''),
      best: current.best, reply: evals[ply]?.best ?? null, mateBefore: evals[ply - 1]?.mate ?? null, mateAfter: evals[ply]?.mate ?? null,
    })
    : ''
  // share of the bar filled with the player's colour (from the bottom)
  const whitePct = evalNow ? winPct(clip(evalNow.mate !== null ? (evalNow.cp > 0 ? 10000 : -10000) : evalNow.cp)) : 50
  const barPct = playerColor === 'w' ? whitePct : 100 - whitePct

  async function copyPgn() {
    if (!pgn) return
    try { await navigator.clipboard.writeText(pgn); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }

  return (
    <div className="review-screen">
      <header className="game-header">
        <button className="icon-btn" onClick={onClose} aria-label={t('Zurück')}><Icon name="back" /></button>
        <div className="game-title">{t('Partieanalyse')}</div>
        {pgn ? <button className="icon-btn" onClick={copyPgn} aria-label={t('PGN kopieren')}>{copied ? <Icon name="check" /> : <span className="pgn-btn">PGN</span>}</button> : <span style={{ width: 44 }} />}
      </header>

      {!done ? (
        <div className="review-progress">
          <div>{t('Die Engine analysiert deine Partie… {n}%', { n: Math.round((progressN / fens.length) * 100) })}</div>
          <div className="bar"><div style={{ width: `${(progressN / fens.length) * 100}%` }} /></div>
        </div>
      ) : (
        <div className="review-summary">
          <div className="acc">
            <div><span className="acc-val">{summary.me}</span><span className="acc-label">{t('Du')}</span></div>
            <div className="acc-mid">{t('Genauigkeit')}<br /><small>{t('(Schätzung)')}</small></div>
            <div><span className="acc-val bot">{summary.bot}</span><span className="acc-label">{opponent}</span></div>
          </div>
          {summary.perf && <div className="perf-line">{t('Deine Leistung in dieser Partie:')} <strong>{t('ca. {n}', { n: summary.perf })}</strong> Elo</div>}
          <div className="grade-row">
            {(Object.keys(GRADES) as Grade[]).map((g) => (
              <div key={g} className="grade-chip" style={{ color: GRADES[g].color }}>
                <strong>{summary.counts[g]}</strong> <span>{GRADES[g].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <svg className="eval-graph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onClick={(e) => {
        const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
        go(Math.round(((e.clientX - r.left) / r.width) * (fens.length - 1)))
      }}>
        <rect x="0" y="0" width={W} height={H} fill="#403e3a" />
        {area && <path d={area} fill="#eeeeee" />}
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="#888" strokeWidth="0.5" />
        {done && graded.map((g, i) => (g.grade === 'mistake' || g.grade === 'blunder') && g.move.color === playerColor ? (
          <circle key={i} cx={((i + 1) / (fens.length - 1)) * W} cy={H - (winPct(clip(evals[i + 1].cp)) / 100) * H} r="3" fill={GRADES[g.grade].color} />
        ) : null)}
        <line x1={(ply / Math.max(1, fens.length - 1)) * W} x2={(ply / Math.max(1, fens.length - 1)) * W} y1="0" y2={H} stroke="#7fb34a" strokeWidth="2" />
      </svg>

      <div className="review-board">
        <div className="eval-bar" aria-label={t('Bewertung')}>
          <div className={'eval-fill ' + playerColor} style={{ height: `${barPct}%` }} />
        </div>
        <div className="review-board-inner">
          <Board fen={fens[ply]} orientation={playerColor} lastMove={lastMove} arrows={bestPrev ? [{ ...bestPrev, color: 'info' }] : []} />
        </div>
      </div>

      <div className="review-explain">
        {ply === 0 && <span>{t('Startstellung. Tippe auf ›, um Zug für Zug durchzugehen.')}</span>}
        {ply > 0 && !current && <span>{Math.ceil(ply / 2)}. {notate(history[ply - 1].san)}</span>}
        {current && (
          <>
            <span className="grade-badge" style={{ background: GRADES[current.grade].color }}>{GRADES[current.grade].icon}</span>
            <span>
              <strong>{Math.ceil(ply / 2)}{current.move.color === 'w' ? '.' : '…'} {notate(current.move.san)}</strong> {GRADE_TEXT[current.grade]}
              {current.grade !== 'best' && current.best && !why && <> {t('Besser war')} <strong>{uciToSan(fens[ply - 1], current.best)}</strong> {t('(blauer Pfeil).')}</>}
              {why && <span className="why"><strong>{t('Warum?')}</strong> {why}</span>}
            </span>
          </>
        )}
        {evalNow && <span className="eval-now">{evalText(evalNow.cp, evalNow.mate)}</span>}
      </div>

      {done && keyMoments.length > 0 && (
        <div className="key-moments">
          <span className="km-label">{t('Deine Fehler:')}</span>
          {keyMoments.map((k) => (
            <button key={k.ply} className={'km' + (k.ply === ply ? ' active' : '')} style={{ borderColor: GRADES[k.grade].color }} onClick={() => go(k.ply)}>
              {Math.ceil(k.ply / 2)}. {notate(k.move.san)} <span style={{ color: GRADES[k.grade].color }}>{GRADES[k.grade].icon}</span>
            </button>
          ))}
        </div>
      )}

      <nav className="game-actions">
        <button onClick={() => go(0)}><span>⏮</span>{t('Anfang')}</button>
        <button onClick={() => go(ply - 1)} disabled={ply === 0}><span>‹</span>{t('Zurück')}</button>
        <button onClick={() => go(ply + 1)} disabled={ply === fens.length - 1}><span>›</span>{t('Weiter')}</button>
        <button onClick={() => go(fens.length - 1)}><span>⏭</span>{t('Ende')}</button>
      </nav>
    </div>
  )
}
