import { t } from '../i18n'
import { Chess, type Color, type Move, type Square } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import Board, { type Arrow, type SquarePair } from '../components/Board'
import Icon from '../components/Icon'
import TheorySheet from '../components/TheorySheet'
import { ENDGAME_THEORY } from '../data/learnTheory'
import { EndgameTheoryPage } from '../screens/TheoryPage'
import type { Endgame } from '../data/endgames'
import { evaluate } from '../engine/stockfish'
import { hasMethodHint, loadTable, methodHint } from '../lib/methodHint'
import { playSound } from '../lib/sound'

function moveSound(m: Move, chess: Chess) {
  if (chess.inCheck()) playSound('check')
  else if (m.promotion) playSound('promote')
  else if (m.captured) playSound('capture')
  else playSound('move')
}

type Status = 'intro' | 'play' | 'thinking' | 'won' | 'lost'

const DEPTH = 14

// Plays an endgame position against the full-strength engine.
// onFinish gets the stars (0 = failed).
export default function EndgameTrainer({ endgame, onFinish }: { endgame: Endgame; onFinish: (stars: number) => void }) {
  const chessRef = useRef(new Chess(endgame.fen))
  const chess = chessRef.current
  const me: Color = endgame.fen.split(' ')[1] as Color
  const opp: Color = me === 'w' ? 'b' : 'w'
  const [fen, setFen] = useState(endgame.fen)
  const [status, setStatus] = useState<Status>('intro')
  const [last, setLast] = useState<SquarePair | null>(null)
  const [moves, setMoves] = useState(0)
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null)
  const [hints, setHints] = useState(0)
  const [message, setMessage] = useState<{ text: string; tone: '' | 'good' | 'bad' }>({ text: t('Du bist am Zug.'), tone: '' })
  const [showTip, setShowTip] = useState(false)
  const theory = ENDGAME_THEORY[endgame.id]
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  function starsFor(n: number) {
    let s = 3
    if (endgame.stars) s = n <= endgame.stars[0] ? 3 : n <= endgame.stars[1] ? 2 : 1
    return Math.max(1, s - hints)
  }

  function win(text: string, n: number) {
    setStatus('won')
    playSound('correct')
    setMessage({ text, tone: 'good' })
    window.setTimeout(() => alive.current && onFinish(starsFor(n)), 1100)
  }

  function lose(text: string) {
    setStatus('lost')
    playSound('wrong')
    setMessage({ text, tone: 'bad' })
  }

  function pawns(c: Color) {
    let n = 0
    for (const row of chess.board()) for (const p of row) if (p && p.type === 'p' && p.color === c) n++
    return n
  }

  // checks after any move whether the exercise is decided by the rules of the game
  function decidedByRules(n: number): boolean {
    if (chess.isCheckmate()) {
      if (chess.turn() === opp) win(n === 1 ? t('Matt in 1 Zug!') : t('Matt in {n} Zügen!', { n }), n)
      else lose(t('Du wurdest mattgesetzt.'))
      return true
    }
    if (chess.isDraw() || chess.isStalemate()) {
      const stale = chess.isStalemate()
      const why = stale ? t('Patt') : chess.isInsufficientMaterial() ? t('zu wenig Material') : t('Remis')
      if (endgame.goal === 'hold' || endgame.goal === 'stop') win(t('Remis ({why}). Ziel erreicht!', { why }), n)
      else lose(stale ? t('Patt! Der Gewinn ist weg. Versuch es nochmal.') : t('Remis. Der Gewinn ist weg. Versuch es nochmal.'))
      return true
    }
    return false
  }

  async function opponentMove(n: number) {
    setStatus('thinking')
    const before = chess.fen()
    const e = await evaluate(before, DEPTH)
    if (!alive.current || chess.fen() !== before) return
    const mine = -e.bestCp // evaluation from the player's point of view
    if ((endgame.goal === 'mate' || endgame.goal === 'promote') && mine < 150) {
      lose(t('Jetzt ist die Stellung nur noch Remis. Schau dir den Tipp an und versuch es nochmal.'))
      return
    }
    if ((endgame.goal === 'hold' || endgame.goal === 'stop') && mine < -300) {
      lose(t('Jetzt gewinnt der Gegner. Schau dir den Tipp an und versuch es nochmal.'))
      return
    }
    if (!e.best) return
    await new Promise((r) => setTimeout(r, 350))
    if (!alive.current) return
    const m = chess.move({ from: e.best.slice(0, 2), to: e.best.slice(2, 4), promotion: e.best[4] })
    moveSound(m, chess)
    setFen(chess.fen())
    setLast({ from: m.from, to: m.to })
    if (decidedByRules(n)) return
    if (m.promotion && (endgame.goal === 'hold' || endgame.goal === 'stop')) {
      lose(t('Der Bauer ist durchgekommen.'))
      return
    }
    if (endgame.goal === 'stop' && pawns(opp) === 0) { win(t('Bauer geschlagen. Ziel erreicht!'), n); return }
    if (endgame.goal === 'hold' && n >= (endgame.holdMoves ?? 15)) { win(t('{n} Züge gehalten. Das ist Remis!', { n }), n); return }
    if (n >= endgame.maxMoves) { lose(t('Zu viele Züge. Versuch es nochmal schneller.')); return }
    setStatus('play')
    setMessage({ text: t('Du bist am Zug.'), tone: '' })
  }

  function onMove(from: string, to: string, promotion?: string) {
    if (status !== 'play') return
    let m: Move
    try { m = chess.move({ from, to, promotion }) } catch { return }
    const n = moves + 1
    setMoves(n)
    moveSound(m, chess)
    setFen(chess.fen())
    setLast({ from: m.from, to: m.to })
    setHintArrow(null)
    if (decidedByRules(n)) return
    if (endgame.goal === 'promote' && m.promotion && !chess.isAttacked(m.to as Square, opp)) {
      win(n === 1 ? t('Neue Dame nach 1 Zug!') : t('Neue Dame nach {n} Zügen!', { n }), n)
      return
    }
    if (endgame.goal === 'stop' && pawns(opp) === 0) { win(t('Bauer geschlagen. Ziel erreicht!'), n); return }
    void opponentMove(n)
  }

  async function hint() {
    if (status !== 'play') return
    const before = chess.fen()
    // basic mates: the tip follows the method from the theory page, with the step it belongs to
    if (hasMethodHint(endgame.id)) {
      const tb = await loadTable(endgame.id, import.meta.env.BASE_URL).catch(() => null)
      if (!alive.current || chess.fen() !== before) return
      const h = methodHint(endgame.id, before, tb, [endgame.fen, ...chess.history({ verbose: true }).map((m) => m.after)])
      if (h) {
        setHints((n) => n + 1)
        setHintArrow({ from: h.from, to: h.to })
        setMessage({ text: h.text, tone: '' })
        return
      }
    }
    setStatus('thinking')
    const e = await evaluate(before, DEPTH)
    if (!alive.current) return
    setStatus('play')
    if (chess.fen() !== before || !e.best) return
    setHints((h) => h + 1)
    setHintArrow({ from: e.best.slice(0, 2), to: e.best.slice(2, 4) })
  }

  function restart() {
    chess.load(endgame.fen)
    setFen(endgame.fen)
    setLast(null)
    setMoves(0)
    setHintArrow(null)
    setStatus('play')
    setMessage({ text: t('Du bist am Zug.'), tone: '' })
  }

  const counter = endgame.goal === 'hold' ? t('{a}/{b} Züge', { a: moves, b: endgame.holdMoves }) : moves === 1 ? t('1 Zug') : t('{n} Züge', { n: moves })

  return (
    <div className="puzzle-player endgame-trainer">
      <div className="ot-head">
        <strong>{counter}</strong>
        <span>{endgame.task}</span>
      </div>
      <Board fen={fen} orientation={me} movableColor={status === 'play' ? me : null} lastMove={last} arrows={hintArrow ? [hintArrow] : []} onMove={onMove} />
      <div className={'puzzle-status ' + message.tone}>
        <span className={'turn-dot ' + me} />
        <span className="puzzle-text">{status === 'thinking' ? t('Die Engine überlegt…') : message.text}</span>
      </div>
      <div className="puzzle-tools">
        <button className="btn secondary small" onClick={() => setShowTip(true)}><Icon name="book" /> {t('Theorie')}</button>
        {status === 'lost'
          ? <button className="btn primary small" onClick={restart}><Icon name="refresh" /> {t('Nochmal')}</button>
          : <button className="btn secondary small" onClick={hint} disabled={status !== 'play'}><Icon name="bulb" /> {t('Tipp')}</button>}
      </div>

      {status === 'intro' && (
        <TheorySheet
          title={endgame.name}
          intro={endgame.task}
          button={t('Los geht’s')}
          onClose={() => setStatus('play')}
          blocks={[
            { title: t('Die Idee'), text: theory?.idea ?? endgame.tip },
            { title: t('Methode'), text: t('Die Methode Schritt für Schritt mit Stellungsbild findest du jederzeit unter „Theorie“.') },
            { title: t('Sterne'), text: endgame.stars ? t('3 Sterne: höchstens {a} Züge · 2 Sterne: höchstens {b} Züge. Jeder Tipp kostet einen Stern.', { a: endgame.stars[0], b: endgame.stars[1] }) : '' },
          ]}
        />
      )}
      {showTip && <EndgameTheoryPage endgame={endgame} onClose={() => setShowTip(false)} />}
    </div>
  )
}
