import { quote, t, tk } from '../i18n'
import Icon from '../components/Icon'
import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import Board, { type SquarePair } from '../components/Board'
import { botLine, botMove, hintMove, type Bot, type ChatEvent } from '../bots'
import { evaluate } from '../engine/stockfish'
import { notate, PIECE_ACC, VALUES, uciToSan } from '../lib/chessText'
import { pieceUrl, settings } from '../lib/settings'
import { playSound } from '../lib/sound'
import { addXp, progress, recordDaily, recordGame, type XpGain } from '../lib/progress'
import { addGame } from '../lib/archive'
import { rating, recordRatedGame } from '../lib/rating'
import { parseTc } from '../lib/timeControl'
import BotAvatar from '../components/BotAvatar'
import ReviewScreen from './ReviewScreen'
import { useBack } from '../lib/back'
import './GameScreen.css'

export interface SavedGame {
  botId: string
  playerColor: Color
  pgn: string
  result?: GameResult | null
  id?: string
  tc?: string // time control, e.g. "10+0"; empty = no clock
  clock?: { w: number; b: number } // remaining milliseconds
  rated?: boolean // false once a hint or take-back was used
  mode?: 'rated' | 'training' // rated: no help at all; training: every help, never rated (older saves: undefined)
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
    return { title: playerWon ? tk('Du hast gewonnen!') : tk('Du hast verloren'), reason: tk('durch Schachmatt'), outcome: playerWon ? 'win' : 'loss' }
  }
  if (chess.isStalemate()) return { title: tk('Remis'), reason: tk('durch Patt'), outcome: 'draw' }
  if (chess.isInsufficientMaterial()) return { title: tk('Remis'), reason: tk('ungenügendes Material'), outcome: 'draw' }
  if (chess.isThreefoldRepetition()) return { title: tk('Remis'), reason: tk('dreifache Stellungswiederholung'), outcome: 'draw' }
  if (chess.isDraw()) return { title: tk('Remis'), reason: tk('50-Züge-Regel'), outcome: 'draw' }
  return null
}

// FIDE rule: running out of time is only a loss if the opponent could still mate at all
function canMate(chess: Chess, color: Color) {
  const pieces = chess.board().flat().filter((p) => p && p.color === color && p.type !== 'k')
  if (pieces.length === 0) return false
  if (pieces.length === 1 && (pieces[0]!.type === 'n' || pieces[0]!.type === 'b')) return false
  return true
}

function moveSound(m: Move, chess: Chess) {
  if (chess.inCheck()) playSound('check')
  else if (m.promotion) playSound('promote')
  else if (m.captured) playSound('capture')
  else if (m.san.startsWith('O-O')) playSound('castle')
  else playSound('move')
}

interface Chat { text: string; id: number }

function fmtClock(ms: number) {
  const t = Math.max(0, ms)
  const m = Math.floor(t / 60000)
  const sec = Math.floor((t % 60000) / 1000)
  if (t < 20000) return `${m}:${String(sec).padStart(2, '0')},${Math.floor((t % 1000) / 100)}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function PlayerBar({ name, sub, avatar, color, captured, diff, thinking, bubble, bubbleBelow, clock, running }: {
  name: string; sub: string; avatar: React.ReactNode; color: string
  captured: PieceSymbol[]; diff: number; thinking?: boolean
  bubble?: Chat | null; bubbleBelow?: boolean
  clock?: number | null; running?: boolean
}) {
  const capturedColor: Color = color === 'w' ? 'b' : 'w'
  return (
    <div className="player-bar">
      {bubble && <div key={bubble.id} className={'speech ' + (bubbleBelow ? 'below' : 'above')}>{bubble.text}</div>}
      <div className="avatar">{avatar}</div>
      <div className="player-info">
        <div className="player-name">{name} <span className="player-sub">{sub}</span>{thinking && <span className="thinking">{t('denkt nach…')}</span>}</div>
        <div className="captured">
          {captured.map((p, i) => <img key={i} src={pieceUrl(capturedColor, p)} alt="" />)}
          {diff > 0 && <span className="diff">+{diff}</span>}
        </div>
      </div>
      {clock != null && <div className={'clock' + (running ? ' running' : '') + (clock < 20000 ? ' low' : '')}>{fmtClock(clock)}</div>}
    </div>
  )
}

export default function GameScreen({ bot, saved, onSave, onExit, onAbort }: {
  bot: Bot
  saved: SavedGame
  onSave: (g: SavedGame) => void
  onExit: () => void
  onAbort: () => void // leave a game in its first moves without any result
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
  useBack(() => {
    if (confirmResign) setConfirmResign(false)
    else if (showResult) setShowResult(false)
    else onExit()
  })
  const [coachBusy, setCoachBusy] = useState(false)
  const [warning, setWarning] = useState<CoachWarning | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [chat, setChat] = useState<Chat | null>(null)
  const [endLine, setEndLine] = useState<string | null>(null)
  const strict = saved.mode === 'rated' // rated game: no coach, hints or take-backs
  const coachOn = s.coach && !strict
  const [rated, setRatedState] = useState(saved.mode === 'training' ? false : saved.rated ?? true)
  const ratedRef = useRef(rated)
  const setRated = (v: boolean) => { ratedRef.current = v; setRatedState(v) }
  const [ratingResult, setRatingResult] = useState<{ after: number; delta: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const gameId = useRef(saved.id ?? `g${Date.now()}`)
  const tc = parseTc(saved.tc)
  const clockRef = useRef<{ w: number; b: number } | null>(tc ? (saved.clock ?? { w: tc.base * 1000, b: tc.base * 1000 }) : null)
  const [clock, setClock] = useState(clockRef.current)
  const tickFrom = useRef(Date.now())
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
    onSave(snapshot(newResult))
  }

  function snapshot(r: GameResult | null, ratedNow = ratedRef.current): SavedGame {
    return { botId: bot.id, playerColor, pgn: game.pgn(), result: r, id: gameId.current, tc: saved.tc, clock: clockRef.current ?? undefined, rated: ratedNow, mode: saved.mode }
  }

  function unrate(why: string) {
    if (!ratedRef.current) return
    setRated(false)
    onSave(snapshot(result, false))
    setNotice(why === 'hint' ? t('Diese Partie ist jetzt ungewertet (Tipp).') : t('Diese Partie ist jetzt ungewertet (Zurücknahme).'))
    window.setTimeout(() => setNotice(null), 3200)
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
    // rating and archive (games with at least one move of the player)
    const myMoves = game.history({ verbose: true }).filter((m) => m.color === playerColor).length
    const countRated = ratedRef.current && myMoves >= 1
    let rr: { after: number; delta: number } | null = null
    if (countRated) {
      const res = recordRatedGame(bot.rating, r.outcome)
      rr = { after: res.after, delta: res.delta }
      setRatingResult(rr)
    }
    setPgnHeaders(r)
    addGame({
      id: gameId.current, date: new Date().toISOString(), botId: bot.id, botName: bot.name, botRating: bot.rating,
      color: playerColor, outcome: r.outcome, reason: r.reason, pgn: game.pgn(), moves: Math.ceil(game.history().length / 2),
      rated: countRated, ratingAfter: rr?.after, ratingDelta: rr?.delta, tc: saved.tc || undefined,
    })
  }

  function setPgnHeaders(r: GameResult) {
    const me = t('Ich')
    const opp = `${bot.name} (${bot.rating})`
    game.setHeader('Event', t('Schach-App'))
    game.setHeader('Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'))
    game.setHeader('White', playerColor === 'w' ? me : opp)
    game.setHeader('Black', playerColor === 'w' ? opp : me)
    const playerWon = r.outcome === 'win'
    const res = r.outcome === 'draw' ? '1/2-1/2' : (playerWon === (playerColor === 'w')) ? '1-0' : '0-1'
    game.setHeader('Result', res)
    if (saved.tc) game.setHeader('TimeControl', saved.tc)
    if (playerColor === 'w') game.setHeader('WhiteElo', String(rating.get().rating))
    else game.setHeader('BlackElo', String(rating.get().rating))
    game.setHeader(playerColor === 'w' ? 'BlackElo' : 'WhiteElo', String(bot.rating))
  }

  function applyMove(from: string, to: string, promotion?: string): Move | undefined {
    let m: Move
    try {
      m = game.move({ from, to, promotion })
    } catch {
      return
    }
    moveSound(m, game)
    if (clockRef.current && tc) {
      const c = { ...clockRef.current }
      c[m.color] -= Date.now() - tickFrom.current
      c[m.color] += tc.inc * 1000
      clockRef.current = c
      tickFrom.current = Date.now()
      setClock(c)
    }
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
    if (!m || !coachOn || game.isGameOver()) return
    // Coach: compare the evaluation before and after the move
    setCoachBusy(true)
    const after = game.fen()
    try {
      const [e1, e2] = await Promise.all([cachedEval(before), cachedEval(after)])
      if (game.fen() !== after) return
      const lossCp = e1.bestCp + e2.bestCp // e2 is from the opponent's point of view
      if (lossCp >= COACH_THRESHOLD && e1.bestCp > -400) {
        let text = t('Vorsicht, nach diesem Zug stehst du deutlich schlechter.')
        if (e2.bestCp >= 1000) {
          text = t('Achtung! Dein Gegner kann dich jetzt mattsetzen.')
        } else if (e2.best) {
          const target = new Chess(after).get(e2.best.slice(2, 4) as Parameters<Chess['get']>[0])
          if (target && VALUES[target.type] >= 3) {
            text = t('Achtung! Dein Gegner kann jetzt {piece} auf {square} schlagen.', { piece: PIECE_ACC[target.type], square: e2.best.slice(2, 4) })
          } else if (target) {
            text = t('Achtung! Damit verlierst du Material.')
          }
        }
        playSound('warn')
        setWarning({ text, better: e1.best ? uciToSan(before, e1.best) : null })
      }
    } finally {
      setCoachBusy(false)
    }
  }

  // chess clock: the side to move loses time while nothing else is pending
  // the clock also stops while the app is in the background (offline game against a bot)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  const clockPaused = !!result || !!warning || coachBusy || reviewing || hidden
  useEffect(() => {
    if (!clockRef.current) return
    tickFrom.current = Date.now()
    if (clockPaused) return
    const id = window.setInterval(() => {
      const c = clockRef.current
      if (!c) return
      const turn = game.turn()
      const left = c[turn] - (Date.now() - tickFrom.current)
      setClock({ ...c, [turn]: left })
      if (left <= 0) {
        clockRef.current = { ...c, [turn]: 0 }
        token.current++
        setThinking(false)
        const playerFlagged = turn === playerColor
        const r: GameResult = !canMate(game, turn === 'w' ? 'b' : 'w')
          ? { title: tk('Remis'), reason: tk('Zeit abgelaufen, aber der Gegner kann nicht mehr mattsetzen'), outcome: 'draw' }
          : playerFlagged
            ? { title: tk('Du hast verloren'), reason: tk('Zeit abgelaufen'), outcome: 'loss' }
            : { title: tk('Du hast gewonnen!'), reason: t('{name} hat die Zeit überschritten', { name: bot.name }), outcome: 'win' }
        playSound('warn')
        finish(r)
        onSave(snapshot(r))
      }
    }, 100)
    return () => {
      // book the time used so far when pausing or after a move
      const c = clockRef.current
      if (c && !game.isGameOver()) {
        const turn = game.turn()
        clockRef.current = { ...c, [turn]: c[turn] - (Date.now() - tickFrom.current) }
      }
      tickFrom.current = Date.now()
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, clockPaused])

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
    if (coachOn && !result && game.turn() === playerColor && !game.isGameOver()) void cachedEval(game.fen())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, coachOn])

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
    unrate('undo')
    sync(null)
    say('takeback', 0.7)
  }

  async function showHint() {
    if (thinking || result || game.turn() !== playerColor) return
    const uci = await hintMove(game.fen())
    setHintsUsed((n) => n + 1)
    unrate('hint')
    say('hint', 0.35)
    setHint({ from: uci.slice(0, 2), to: uci.slice(2, 4) })
  }

  function resign() {
    const r: GameResult = { title: tk('Du hast verloren'), reason: tk('durch Aufgabe'), outcome: 'loss' }
    token.current++
    setThinking(false)
    setConfirmResign(false)
    finish(r)
    onSave(snapshot(r))
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
    return <ReviewScreen history={history} playerColor={playerColor} opponent={bot.name} gameId={result ? gameId.current : undefined} pgn={result ? game.pgn() : undefined} onClose={() => setReviewing(false)} />
  }

  const orientation: Color = flipped ? (playerColor === 'w' ? 'b' : 'w') : playerColor
  const botColor: Color = playerColor === 'w' ? 'b' : 'w'
  const top = orientation === playerColor ? 'bot' : 'me'

  const botBar = (
    <PlayerBar name={bot.name} sub={`(${bot.rating})`} color={botColor}
      avatar={<BotAvatar bot={bot} size={40} />}
      captured={capturedBy[botColor]} diff={diff[botColor]} thinking={thinking}
      bubble={chat} bubbleBelow={top === 'bot'}
      clock={clock ? clock[botColor] : null} running={!clockPaused && game.turn() === botColor} />
  )
  const meBar = (
    <PlayerBar name={t('Du')} sub={`(${rating.get().rating})${strict ? ` · ${t('gewertet')}` : rated ? '' : ` · ${t('Training')}`}${coachOn ? ` · ${t('Trainer an')}` : ''}`} color={playerColor}
      avatar={<BotAvatar bot={null} size={40} />}
      captured={capturedBy[playerColor]} diff={diff[playerColor]}
      clock={clock ? clock[playerColor] : null} running={!clockPaused && game.turn() === playerColor} />
  )

  const pairs: { n: number; w?: Move; b?: Move; wi: number; bi: number }[] = []
  history.forEach((m, i) => {
    if (m.color === 'w' || pairs.length === 0) pairs.push({ n: pairs.length + 1, wi: -1, bi: -1 })
    const p = pairs[pairs.length - 1]
    if (m.color === 'w') { p.w = m; p.wi = i } else { p.b = m; p.bi = i }
  })

  const canAct = !thinking && !coachBusy && !warning
  // like on a chess server: before your second move the game can be cancelled without a result
  const canAbort = !result && game.history({ verbose: true }).filter((m) => m.color === playerColor).length < 2
  function abort() {
    token.current++
    setThinking(false)
    onAbort()
  }

  return (
    <div className="game-screen">
      <header className="game-header">
        <button className="icon-btn" onClick={onExit} aria-label={t('Zurück')}><Icon name="back" /></button>
        <div className="game-title">{t('Gegen {name}', { name: bot.name })}</div>
        <button className="icon-btn" onClick={() => setFlipped(!flipped)} aria-label={t('Brett drehen')}><Icon name="flip" /></button>
      </header>

      <div className="move-list" ref={moveListRef}>
        {pairs.length === 0 && <span className="move-empty">{t('Noch keine Züge')}</span>}
        {pairs.map((p) => (
          <span key={p.n} className="move-pair">
            <span className="move-no">{p.n}.</span>
            {p.w && <button className={'move' + (shownPly === p.wi + 1 ? ' active' : '')} onClick={() => setViewIndex(p.wi + 1 === history.length ? null : p.wi + 1)}>{notate(p.w.san)}</button>}
            {p.b && <button className={'move' + (shownPly === p.bi + 1 ? ' active' : '')} onClick={() => setViewIndex(p.bi + 1 === history.length ? null : p.bi + 1)}>{notate(p.b.san)}</button>}
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
            {warning.better && <div className="coach-better">{t('Besser wäre zum Beispiel')} <strong>{warning.better}</strong>.</div>}
            <div className="coach-buttons">
              <button className="btn primary small" onClick={undo}>{t('Zurücknehmen')}</button>
              <button className="btn secondary small" onClick={() => setWarning(null)}>{t('Weiterspielen')}</button>
            </div>
          </div>
        </div>
      )}

      {notice && <div className="result-strip">{notice}</div>}

      {result && !showResult && (
        <div className="result-strip">
          <strong>{t(result.title)}</strong> {t(result.reason)}
        </div>
      )}

      <nav className="game-actions">
        {result ? (
          <>
            <button onClick={onExit}><Icon name="refresh" />{t('Neue Partie')}</button>
            <button onClick={() => setReviewing(true)}><Icon name="chart" />{t('Analyse')}</button>
          </>
        ) : (
          <>
            {canAbort
              ? <button onClick={abort}><Icon name="flag" />{t('Abbrechen')}</button>
              : <button onClick={() => setConfirmResign(true)}><Icon name="flag" />{t('Aufgeben')}</button>}
            {!strict && <button onClick={showHint} disabled={!canAct || game.turn() !== playerColor}><Icon name="bulb" />{t('Tipp')}{hintsUsed > 0 ? ` (${hintsUsed})` : ''}</button>}
            {!strict && <button onClick={undo} disabled={thinking || history.length === 0}><Icon name="undo" />{t('Zurück')}</button>}
          </>
        )}
        <button onClick={() => setViewIndex(Math.max(0, shownPly - 1))} disabled={shownPly === 0}><Icon name="back" />{t('Voriger')}</button>
        <button onClick={() => setViewIndex(shownPly + 1 >= history.length ? null : shownPly + 1)} disabled={viewIndex === null}><Icon name="next" />{t('Nächster')}</button>
      </nav>

      {confirmResign && (
        <div className="modal-backdrop" onClick={() => setConfirmResign(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('Wirklich aufgeben?')}</h2>
            <div className="modal-buttons">
              <button className="btn secondary" onClick={() => setConfirmResign(false)}>{t('Weiterspielen')}</button>
              <button className="btn primary" onClick={resign}>{t('Aufgeben')}</button>
            </div>
          </div>
        </div>
      )}

      {result && showResult && (
        <div className="modal-backdrop" onClick={() => setShowResult(false)}>
          <div className={'modal result ' + result.outcome} onClick={(e) => e.stopPropagation()}>
            <div className={'result-icon ' + result.outcome}>{result.outcome === 'loss' ? <BotAvatar bot={bot} size={64} /> : <Icon name={result.outcome === 'win' ? 'trophy' : 'heart'} />}</div>
            <h2>{t(result.title)}</h2>
            <p>{t(result.reason)}</p>
            <p className="result-moves">{Math.ceil(history.length / 2) === 1 ? t('1 Zug gegen {name} ({rating})', { name: bot.name, rating: bot.rating }) : t('{n} Züge gegen {name} ({rating})', { n: Math.ceil(history.length / 2), name: bot.name, rating: bot.rating })}</p>
            {ratingResult ? (
              <p className="rating-change">{t('Deine Wertung:')} {ratingResult.after} <span className={ratingResult.delta >= 0 ? 'up' : 'down'}>({ratingResult.delta >= 0 ? '+' : '−'}{Math.abs(ratingResult.delta)})</span></p>
            ) : <p className="rated-tag">{t('Ungewertete Partie')}</p>}
            {endLine && <div className="end-line"><BotAvatar bot={bot} size={36} /><span>{quote(endLine)}</span></div>}
            {xpGain && (
              <div className="xp-gain">
                <span className="xp-pill">+{xpGain.amount} XP</span>
                {xpGain.levelUp && <span className="xp-pill level">{t('Level {n}!', { n: xpGain.newLevel })}</span>}
                {xpGain.streakUp && xpGain.streak > 1 && <span className="xp-pill streak"><Icon name="flame" /> {t('{n} Tage', { n: xpGain.streak })}</span>}
              </div>
            )}
            {history.length > 1 && (
              <button className="btn primary review-btn" onClick={() => { setShowResult(false); setReviewing(true) }}>{t('Partie analysieren')}</button>
            )}
            <div className="modal-buttons">
              <button className="btn secondary" onClick={() => setShowResult(false)}>{t('Brett ansehen')}</button>
              <button className="btn secondary" onClick={onExit}>{t('Neue Partie')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
