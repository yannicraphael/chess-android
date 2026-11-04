import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import Board, { pieceUrl, type SquarePair } from '../components/Board'
import { botMove, hintMove, type Bot } from '../bots'
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

const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const ORDER: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q']
const GERMAN: Record<string, string> = { N: 'S', B: 'L', R: 'T', Q: 'D', K: 'K' }
const de = (san: string) => san.replace(/[NBRQK]/g, (c) => GERMAN[c])

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

function PlayerBar({ name, sub, avatar, color, captured, diff, thinking }: {
  name: string; sub: string; avatar: React.ReactNode; color: string
  captured: PieceSymbol[]; diff: number; thinking?: boolean
}) {
  const capturedColor: Color = color === 'w' ? 'b' : 'w'
  return (
    <div className="player-bar">
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
  const [thinking, setThinking] = useState(false)
  const [hint, setHint] = useState<SquarePair | null>(null)
  const [viewIndex, setViewIndex] = useState<number | null>(null) // null = live position
  const [flipped, setFlipped] = useState(false)
  const [confirmResign, setConfirmResign] = useState(false)
  const token = useRef(0)
  const moveListRef = useRef<HTMLDivElement>(null)

  function sync(newResult: GameResult | null = result) {
    setFen(game.fen())
    setHistory(game.history({ verbose: true }))
    setHint(null)
    setViewIndex(null)
    onSave({ botId: bot.id, playerColor, pgn: game.pgn(), result: newResult })
  }

  function finishIfOver() {
    const r = detectResult(game, playerColor)
    if (r) {
      setResult(r)
      setShowResult(true)
    }
    return r
  }

  function applyMove(from: string, to: string, promotion?: string) {
    try {
      game.move({ from, to, promotion })
    } catch {
      return
    }
    const r = finishIfOver()
    sync(r)
  }

  // let the bot move whenever it is its turn
  useEffect(() => {
    if (result || game.isGameOver() || game.turn() === playerColor) return
    const my = ++token.current
    setThinking(true)
    const started = Date.now()
    const currentFen = game.fen()
    botMove(currentFen, bot).then(async (uci) => {
      const wait = 500 + Math.random() * 500 - (Date.now() - started)
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      if (my !== token.current || game.fen() !== currentFen) return
      setThinking(false)
      applyMove(uci.slice(0, 2), uci.slice(2, 4), uci[4])
    })
    return () => {
      token.current++
      setThinking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, result])

  useEffect(() => {
    const el = moveListRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [history.length])

  function undo() {
    if (thinking || result || history.length === 0) return
    game.undo()
    while (game.history().length > 0 && game.turn() !== playerColor) game.undo()
    sync(null)
  }

  async function showHint() {
    if (thinking || result || game.turn() !== playerColor) return
    const uci = await hintMove(game.fen())
    setHint({ from: uci.slice(0, 2), to: uci.slice(2, 4) })
  }

  function resign() {
    const r: GameResult = { title: 'Du hast verloren', reason: 'durch Aufgabe', outcome: 'loss' }
    token.current++
    setThinking(false)
    setResult(r)
    setShowResult(true)
    setConfirmResign(false)
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
    let material = 0 // white minus black, from the pieces on the board
    for (const row of new Chess(displayFen).board()) for (const p of row) if (p) material += (p.color === 'w' ? 1 : -1) * VALUES[p.type]
    return { capturedBy: { w: sort(cap.w), b: sort(cap.b) }, diff: { w: material, b: -material } }
  }, [history, shownPly, displayFen])

  const orientation: Color = flipped ? (playerColor === 'w' ? 'b' : 'w') : playerColor
  const botColor: Color = playerColor === 'w' ? 'b' : 'w'
  const top = orientation === playerColor ? 'bot' : 'me'

  const botBar = (
    <PlayerBar name={bot.name} sub={`(${bot.rating})`} color={botColor}
      avatar={<span className="emoji-avatar" style={{ background: bot.color }}>{bot.emoji}</span>}
      captured={capturedBy[botColor]} diff={diff[botColor]} thinking={thinking} />
  )
  const meBar = (
    <PlayerBar name="Du" sub="" color={playerColor}
      avatar={<span className="emoji-avatar" style={{ background: '#5d6670' }}>🙂</span>}
      captured={capturedBy[playerColor]} diff={diff[playerColor]} />
  )

  // group SAN moves into pairs for the move list
  const pairs: { n: number; w?: Move; b?: Move; wi: number; bi: number }[] = []
  history.forEach((m, i) => {
    if (m.color === 'w' || pairs.length === 0) pairs.push({ n: pairs.length + 1, wi: -1, bi: -1 })
    const p = pairs[pairs.length - 1]
    if (m.color === 'w') { p.w = m; p.wi = i } else { p.b = m; p.bi = i }
  })

  return (
    <div className="game-screen">
      <header className="game-header">
        <button className="icon-btn" onClick={onExit} aria-label="Zurück">‹</button>
        <div className="game-title">Gegen {bot.name}</div>
        <button className="icon-btn" onClick={() => setFlipped(!flipped)} aria-label="Brett drehen">⇅</button>
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
          movableColor={viewIndex === null && !result && !thinking ? playerColor : null}
          lastMove={lastMove}
          hint={viewIndex === null ? hint : null}
          onMove={applyMove}
        />
        {top === 'bot' ? meBar : botBar}
      </div>

      {result && !showResult && (
        <div className="result-strip">
          <strong>{result.title}</strong> {result.reason}
        </div>
      )}

      <nav className="game-actions">
        {result ? (
          <>
            <button onClick={onExit}><span>⟲</span>Neue Partie</button>
            <button onClick={() => setShowResult(true)}><span>🏁</span>Ergebnis</button>
          </>
        ) : (
          <>
            <button onClick={() => setConfirmResign(true)}><span>⚑</span>Aufgeben</button>
            <button onClick={showHint} disabled={thinking || game.turn() !== playerColor}><span>💡</span>Tipp</button>
            <button onClick={undo} disabled={thinking || history.length === 0}><span>↶</span>Zurück</button>
          </>
        )}
        <button onClick={() => setViewIndex(Math.max(0, shownPly - 1))} disabled={shownPly === 0}><span>‹</span>Zug</button>
        <button onClick={() => setViewIndex(shownPly + 1 >= history.length ? null : shownPly + 1)} disabled={viewIndex === null}><span>›</span>Zug</button>
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
            <div className="result-emoji">{result.outcome === 'win' ? '🏆' : result.outcome === 'draw' ? '🤝' : bot.emoji}</div>
            <h2>{result.title}</h2>
            <p>{result.reason}</p>
            <p className="result-moves">{Math.ceil(history.length / 2)} Züge gegen {bot.name} ({bot.rating})</p>
            <div className="modal-buttons">
              <button className="btn secondary" onClick={() => setShowResult(false)}>Brett ansehen</button>
              <button className="btn primary" onClick={onExit}>Neue Partie</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
