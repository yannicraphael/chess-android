import Icon from '../components/Icon'
import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import Board, { type SquarePair } from '../components/Board'
import { botLine, botMove, hintMove, type Bot, type ChatEvent } from '../bots'
import { evaluate } from '../engine/stockfish'
import { de, PIECE_ACC, VALUES, uciToSan } from '../lib/chessText'
import { pieceUrl, settings } from '../lib/settings'
import { playSound } from '../lib/sound'
import { addXp, progress, recordDaily, recordGame, type XpGain } from '../lib/progress'
import BotAvatar from '../components/BotAvatar'
import ReviewScreen from './ReviewScreen'
import './GameScreen.css'

export interface SavedGame {
  botId: string
  playerColor: Color
  pgn: string
  result?: GameResult | null
}

export interface GameResult {
  title: string
  reason: string
  outcome: 'win' | 'loss' | 'draw'
}

const ORDER: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q']
const COACH_THRESHOLD = 150 // centipawns lost before the coach warns

interface CoachWarning {
  text: string
  better: string | null
}

function detectResult(chess: Chess, playerColor: Color): GameResult | null {
  if (chess.isCheckmate()) {
    const playerWon = chess.turn() !== playerColor
    return { title: playerWon ? 'Du hast gewonnen!' : 'Du hast verloren', reason: 'durch Schachmatt', outcome: playerWon ? 'win' : 'loss' }
  }
  if (chess.isStalemate()) return { title: 'Remis', reason: 'durch Patt', outcome: 'draw' }
  if (chess.isInsufficientMaterial()) return { title: 'Remis', reason: 'ungenügendes Material', outcome: 'draw' }
  if (chess.isThreefoldRepetition()) return { title: 'Remis', reason: 'dreifache Stellungswiederholung', outcome: 'draw' }
  if (chess.isDraw()) return { title: 'Remis', reason: '50-Züge-Regel', outcome: 'draw' }
  return null
}

function moveSound(m: Move, chess: Chess) {
  if (chess.inCheck()) playSound('check')
  else if (m.promotion) playSound('promote')
  else if (m.captured) playSound('capture')
  else if (m.san.startsWith('O-O')) playSound('castle')
  else playSound('move')
}

interface Chat { text: string; id: number }

function PlayerBar({ name, sub, avatar, color, captured, diff, thinking, bubble, bubbleBelow }: {
  name: string; sub: string; avatar: React.ReactNode; color: string
  captured: PieceSymbol[]; diff: number; thinking?: boolean
  bubble?: Chat | null; bubbleBelow?: boolean
}) {
  const capturedColor: Color = color === 'w' ? 'b' : 'w'
  return (
    <div className="player-bar">
      {bubble && <div key={bubble.id} className={'speech ' + (bubbleBelow ? 'below' : 'above')}>{bubble.text}</div>}
      <div className="avatar">{avatar}</div>
      <div className="player-info">
        <div className="player-name">{name} <span className="player-sub">{sub}</span>{thinking && <span className="thinking">denkt nach…</span>}</div>
        <div className="captured">
          {captured.map((p, i) => <img key={i} src={pieceUrl(capturedColor, p)} alt="" />)}
          {diff > 0 && <span className="diff">+{diff}</span>}
        </div>
      </div>
    </div>
  )
}

export default function GameScreen({ bot, saved, onSave, onExit }: {
  bot: Bot
  saved: SavedGame
  onSave: (g: SavedGame) => void
  onExit: () => void
}) {
  const s = settings.use()
  const playerColor = saved.playerColor
  const gameRef = useRef<Chess>(null as unknown as Chess)
  if (!gameRef.current) {
    const g = new Chess()
    if (saved.pgn) g.loadPgn(saved.pgn)
    gameRef.current = g
  }
  const game = gameRef.current
  const [fen, setFen] = useState(game.fen())
  const [history, setHistory] = useState<Move[]>(game.history({ verbose: true }))
  const [result, setResult] = useState<GameResult | null>(saved.result ?? null)
  const [showResult, setShowResult] = useState(false)
  const [xpGain, setXpGain] = useState<XpGain | null>(null)
  const [thinking, setThinking] = useState(false)
  const [hint, setHint] = useState<SquarePair | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [viewIndex, setViewIndex] = useState<number | null>(null) // null = live position
  const [flipped, setFlipped] = useState(false)
  const [confirmResign, setConfirmResign] = useState(false)
  const [coachBusy, setCoachBusy] = useState(false)
  const [warning, setWarning] = useState<CoachWarning | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [chat, setChat] = useState<Chat | null>(null)
  const [endLine, setEndLine] = useState<string | null>(null)
  const chatState = useRef({ lastPly: -10, prevScore: null as number | null, winning: false, losing: false, timer: 0, id: 0 })
  const token = useRef(0)
  const moveListRef = useRef<HTMLDivElement>(null)
  const evalCache = useRef(new Map<string, ReturnType<typeof evaluate>>())

  function cachedEval(f: string) {
    let p = evalCache.current.get(f)
    if (!p) {
      p = evaluate(f, 10)
      evalCache.current.set(f, p)
    }
    return p
  }

  // The bot comments on the game now and then (text only).
  function say(event: ChatEvent, chance = 1, force = false) {
    const cs = chatState.current
    const ply = game.history().length
    if (!force) {
      if (ply - cs.lastPly < 3) return
      if (Math.random() > chance * ((bot.chatty ?? 0.4) / 0.4)) return
    }
    const text = botLine(bot, event)
    if (!text) return
    cs.lastPly = ply
    cs.id++
    setChat({ text, id: cs.id })
    clearTimeout(cs.timer)
    cs.timer = window.setTimeout(() => setChat(null), Math.max(3500, text.length * 85))
    return text
  }

  function sync(newResult: GameResult | null = result) {
    setFen(game.fen())
    setHistory(game.history({ verbose: true }))
    setHint(null)
    setViewIndex(null)
    onSave({ botId: bot.id, playerColor, pgn: game.pgn(), result: newResult })
  }

  function finish(r: GameResult) {
    setEndLine(say(r.outcome === 'win' ? 'botLoses' : r.outcome === 'loss' ? 'botWins' : 'draw', 1, true) ?? null)
    setResult(r)
    setShowResult(true)
    setWarning(null)
    playSound(r.outcome === 'win' ? 'win' : r.outcome === 'draw' ? 'draw' : 'lose')
    // XP: winning against stronger bots is worth more, the first win gives a bonus
    const prev = progress.get().bots[bot.id]
    const firstWin = r.outcome === 'win' && !(prev && prev.wins > 0)
    recordGame(bot.id, r.outcome)
    recordDaily('game')
    let xp = r.outcome === 'win' ? 20 + Math.round(bot.rating / 50) : r.outcome === 'draw' ? 12 : 5
    if (firstWin) xp += 50
    const gain = addXp(xp)
    setXpGain(gain)
    if (gain.levelUp) setTimeout(() => playSound('levelup'), 700)
  }

  function applyMove(from: string, to: string, promotion?: string): Move | undefined {
    let m: Move
    try {
      m = game.move({ from, to, promotion })
    } catch {
      return
    }
    moveSound(m, game)
    const r = detectResult(game, playerColor)
    if (r) finish(r)
    sync(r)
    return m
  }

  async function playerMove(from: string, to: string, promotion?: string) {
    const before = game.fen()
    const m = applyMove(from, to, promotion)
    if (m && !game.isGameOver()) {
      if (m.captured && VALUES[m.captured] >= 3) say('playerCapture', 0.6)
      else if (game.inCheck()) say('playerCheck', 0.4)
    }
    if (!m || !s.coach || game.isGameOver()) return
    // Coach: compare the evaluation before and after the move
    setCoachBusy(true)
    const after = game.fen()
    try {
      const [e1, e2] = await Promise.all([cachedEval(before), cachedEval(after)])
      if (game.fen() !== after) return
      const lossCp = e1.bestCp + e2.bestCp // e2 is from the opponent's point of view
      if (lossCp >= COACH_THRESHOLD && e1.bestCp > -400) {
        let text = 'Vorsicht, nach diesem Zug stehst du deutlich schlechter.'
        if (e2.bestCp >= 1000) {
          text = 'Achtung! Dein Gegner kann dich jetzt mattsetzen.'
        } else if (e2.best) {
          const target = new Chess(after).get(e2.best.slice(2, 4) as Parameters<Chess['get']>[0])
          if (target && VALUES[target.type] >= 3) {
            text = `Achtung! Dein Gegner kann jetzt ${PIECE_ACC[target.type]} auf ${e2.best.slice(2, 4)} schlagen.`
          } else if (target) {
            text = 'Achtung! Damit verlierst du Material.'
          }
        }
        playSound('warn')
        setWarning({ text, better: e1.best ? uciToSan(before, e1.best) : null })
      }
    } finally {
      setCoachBusy(false)
    }
  }

  // little "game starts" chime for a fresh game
  useEffect(() => {
    if (game.history().length === 0) {
      playSound('start')
      const t = setTimeout(() => say('greet', 1, true), 500)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // pre-compute the evaluation of the player's position so the coach answers quickly
  useEffect(() => {
    if (s.coach && !result && game.turn() === playerColor && !game.isGameOver()) void cachedEval(game.fen())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, s.coach])

  // let the bot move whenever it is its turn
  useEffect(() => {
    if (result || warning || coachBusy || game.isGameOver() || game.turn() === playerColor) return
    const my = ++token.current
    setThinking(true)
    const started = Date.now()
    const currentFen = game.fen()
    botMove(currentFen, bot).then(async ({ move: uci, score }) => {
      const wait = 450 + Math.random() * 450 - (Date.now() - started)
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      if (my !== token.current || game.fen() !== currentFen) return
      setThinking(false)
      const m = applyMove(uci.slice(0, 2), uci.slice(2, 4), uci[4])
      if (m && !game.isGameOver()) botComment(m, score)
    })
    return () => {
      token.current++
      setThinking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, result, warning, coachBusy])

  // what the bot thinks about the last moves: based on the engine score from the bot's point of view
  function botComment(m: Move, score: number | null) {
    const cs = chatState.current
    const prev = cs.prevScore
    cs.prevScore = score
    if (score !== null && prev !== null && Math.abs(score) < 50000 && Math.abs(prev) < 50000) {
      if (score - prev >= 250 && prev < 600) { say('playerBlunder', 0.85); return }
      if (score - prev <= -200 && prev > -600) { say('playerStrong', 0.7); return }
    }
    if (score !== null && score > 500 && !cs.winning) { cs.winning = true; say('botWinning', 0.8); return }
    if (score !== null && score < -500 && !cs.losing) { cs.losing = true; say('botLosing', 0.8); return }
    if (m.captured && VALUES[m.captured] >= 3) { say('botCapture', 0.65); return }
    if (game.inCheck()) { say('botCheck', 0.45); return }
    if (game.history().length > 8) say('chatter', 0.1)
  }

  useEffect(() => () => clearTimeout(chatState.current.timer), [])

  useEffect(() => {
    const el = moveListRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [history.length])

  function undo() {
    if (thinking || result || history.length === 0) return
    setWarning(null)
    game.undo()
    while (game.history().length > 0 && game.turn() !== playerColor) game.undo()
    chatState.current.prevScore = null
    sync(null)
    say('takeback', 0.7)
  }

  async function showHint() {
    if (thinking || result || game.turn() !== playerColor) return
    const uci = await hintMove(game.fen())
    setHintsUsed((n) => n + 1)
    say('hint', 0.35)
    setHint({ from: uci.slice(0, 2), to: uci.slice(2, 4) })
  }

  function resign() {
    const r: GameResult = { title: 'Du hast verloren', reason: 'durch Aufgabe', outcome: 'loss' }
    token.current++
    setThinking(false)
    setConfirmResign(false)
    finish(r)
    onSave({ botId: bot.id, playerColor, pgn: game.pgn(), result: r })
  }

  // position to display (supports browsing earlier moves)
  const displayFen = useMemo(() => {
    if (viewIndex === null) return fen
    const c = new Chess()
    for (let i = 0; i < viewIndex; i++) c.move(history[i].san)
    return c.fen()
  }, [viewIndex, fen, history])
  const shownPly = viewIndex ?? history.length
  const lastMove = shownPly > 0 ? { from: history[shownPly - 1].from, to: history[shownPly - 1].to } : null

  // captured pieces & material balance at the displayed position
  const { capturedBy, diff } = useMemo(() => {
    const cap: Record<Color, PieceSymbol[]> = { w: [], b: [] }
    for (const m of history.slice(0, shownPly)) if (m.captured) cap[m.color].push(m.captured)
    const sort = (arr: PieceSymbol[]) => [...arr].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y))
    let material = 0
    for (const row of new Chess(displayFen).board()) for (const p of row) if (p) material += (p.color === 'w' ? 1 : -1) * VALUES[p.type]
    return { capturedBy: { w: sort(cap.w), b: sort(cap.b) }, diff: { w: material, b: -material } }
  }, [history, shownPly, displayFen])

  if (reviewing) {
    return <ReviewScreen history={history} playerColor={playerColor} bot={bot} onClose={() => setReviewing(false)} />
  }

  const orientation: Color = flipped ? (playerColor === 'w' ? 'b' : 'w') : playerColor
  const botColor: Color = playerColor === 'w' ? 'b' : 'w'
  const top = orientation === playerColor ? 'bot' : 'me'

  const botBar = (
    <PlayerBar name={bot.name} sub={`(${bot.rating})`} color={botColor}
      avatar={<BotAvatar bot={bot} size={40} />}
      captured={capturedBy[botColor]} diff={diff[botColor]} thinking={thinking}
      bubble={chat} bubbleBelow={top === 'bot'} />
  )
  const meBar = (
    <PlayerBar name="Du" sub={s.coach ? 'Trainer an' : ''} color={playerColor}
      avatar={<BotAvatar bot={null} size={40} />}
      captured={capturedBy[playerColor]} diff={diff[playerColor]} />
  )

  const pairs: { n: number; w?: Move; b?: Move; wi: number; bi: number }[] = []
  history.forEach((m, i) => {
    if (m.color === 'w' || pairs.length === 0) pairs.push({ n: pairs.length + 1, wi: -1, bi: -1 })
    const p = pairs[pairs.length - 1]
    if (m.color === 'w') { p.w = m; p.wi = i } else { p.b = m; p.bi = i }
  })

  const canAct = !thinking && !coachBusy && !warning

  return (
    <div className="game-screen">
      <header className="game-header">
        <button className="icon-btn" onClick={onExit} aria-label="Zurück"><Icon name="back" /></button>
        <div className="game-title">Gegen {bot.name}</div>
        <button className="icon-btn" onClick={() => setFlipped(!flipped)} aria-label="Brett drehen"><Icon name="flip" /></button>
      </header>

      <div className="move-list" ref={moveListRef}>
        {pairs.length === 0 && <span className="move-empty">Noch keine Züge</span>}
        {pairs.map((p) => (
          <span key={p.n} className="move-pair">
            <span className="move-no">{p.n}.</span>
            {p.w && <button className={'move' + (shownPly === p.wi + 1 ? ' active' : '')} onClick={() => setViewIndex(p.wi + 1 === history.length ? null : p.wi + 1)}>{de(p.w.san)}</button>}
            {p.b && <button className={'move' + (shownPly === p.bi + 1 ? ' active' : '')} onClick={() => setViewIndex(p.bi + 1 === history.length ? null : p.bi + 1)}>{de(p.b.san)}</button>}
          </span>
        ))}
      </div>

      <div className="board-area">
        {top === 'bot' ? botBar : meBar}
        <Board
          fen={displayFen}
          orientation={orientation}
          movableColor={viewIndex === null && !result && canAct ? playerColor : null}
          lastMove={lastMove}
          hint={viewIndex === null ? hint : null}
          onMove={playerMove}
        />
        {top === 'bot' ? meBar : botBar}
      </div>

      {warning && (
        <div className="coach-banner">
          <div className="coach-icon"><Icon name="learn" /></div>
          <div className="coach-body">
            <div className="coach-text">{warning.text}</div>
            {warning.better && <div className="coach-better">Besser wäre zum Beispiel <strong>{warning.better}</strong>.</div>}
            <div className="coach-buttons">
              <button className="btn primary small" onClick={undo}>Zurücknehmen</button>
              <button className="btn secondary small" onClick={() => setWarning(null)}>Weiterspielen</button>
            </div>
          </div>
        </div>
      )}

      {result && !showResult && (
        <div className="result-strip">
          <strong>{result.title}</strong> {result.reason}
        </div>
      )}

      <nav className="game-actions">
        {result ? (
          <>
            <button onClick={onExit}><Icon name="refresh" />Neue Partie</button>
            <button onClick={() => setReviewing(true)}><Icon name="chart" />Analyse</button>
          </>
        ) : (
          <>
            <button onClick={() => setConfirmResign(true)}><Icon name="flag" />Aufgeben</button>
            <button onClick={showHint} disabled={!canAct || game.turn() !== playerColor}><Icon name="bulb" />Tipp{hintsUsed > 0 ? ` (${hintsUsed})` : ''}</button>
            <button onClick={undo} disabled={thinking || history.length === 0}><Icon name="undo" />Zurück</button>
          </>
        )}
        <button onClick={() => setViewIndex(Math.max(0, shownPly - 1))} disabled={shownPly === 0}><Icon name="back" />Zug</button>
        <button onClick={() => setViewIndex(shownPly + 1 >= history.length ? null : shownPly + 1)} disabled={viewIndex === null}><Icon name="next" />Zug</button>
      </nav>

      {confirmResign && (
        <div className="modal-backdrop" onClick={() => setConfirmResign(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Wirklich aufgeben?</h2>
            <div className="modal-buttons">
              <button className="btn secondary" onClick={() => setConfirmResign(false)}>Abbrechen</button>
              <button className="btn primary" onClick={resign}>Aufgeben</button>
            </div>
          </div>
        </div>
      )}

      {result && showResult && (
        <div className="modal-backdrop" onClick={() => setShowResult(false)}>
          <div className={'modal result ' + result.outcome} onClick={(e) => e.stopPropagation()}>
            <div className={'result-icon ' + result.outcome}>{result.outcome === 'loss' ? <BotAvatar bot={bot} size={64} /> : <Icon name={result.outcome === 'win' ? 'trophy' : 'heart'} />}</div>
            <h2>{result.title}</h2>
            <p>{result.reason}</p>
            <p className="result-moves">{Math.ceil(history.length / 2)} Züge gegen {bot.name} ({bot.rating})</p>
            {endLine && <div className="end-line"><BotAvatar bot={bot} size={36} /><span>„{endLine}“</span></div>}
            {xpGain && (
              <div className="xp-gain">
                <span className="xp-pill">+{xpGain.amount} XP</span>
                {xpGain.levelUp && <span className="xp-pill level">Level {xpGain.newLevel}!</span>}
                {xpGain.streakUp && xpGain.streak > 1 && <span className="xp-pill streak"><Icon name="flame" /> {xpGain.streak} Tage</span>}
              </div>
            )}
            {history.length > 1 && (
              <button className="btn primary review-btn" onClick={() => { setShowResult(false); setReviewing(true) }}>Partie analysieren</button>
            )}
            <div className="modal-buttons">
              <button className="btn secondary" onClick={() => setShowResult(false)}>Brett ansehen</button>
              <button className="btn secondary" onClick={onExit}>Neue Partie</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
