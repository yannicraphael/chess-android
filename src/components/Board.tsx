import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js'
import { useMemo, useRef, useState } from 'react'
import { boardTheme, boardUrl, pieceUrl, settings } from '../lib/settings'
import './Board.css'

export interface SquarePair {
  from: string
  to: string
}

export interface Arrow {
  from: string
  to: string
  color?: 'good' | 'bad' | 'info' // green (default), red, blue
}

interface Props {
  fen: string
  orientation: Color
  movableColor?: Color | null // null = no moves allowed
  lastMove?: SquarePair | null
  hint?: SquarePair | null
  marks?: Record<string, string> // square -> extra css class (mini-games)
  arrows?: Arrow[]
  showCoords?: boolean
  onMove?: (from: string, to: string, promotion?: PieceSymbol) => void
  onSquareTap?: (square: string) => void // used when no moves are allowed
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

export default function Board({ fen, orientation, movableColor = null, lastMove, hint, marks, arrows, showCoords, onMove, onSquareTap }: Props) {
  const s = settings.use()
  const theme = boardTheme(s.boardTheme)
  const coords = showCoords ?? s.coordinates
  const chess = useMemo(() => new Chess(fen, { skipValidation: true }), [fen])
  const boardRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Square | null>(null)
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number; moved: boolean } | null>(null)
  const [promo, setPromo] = useState<SquarePair | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const wasSelected = useRef(false)
  const draggedTo = useRef<string | null>(null)

  // reset selection whenever the position changes
  const [prevFen, setPrevFen] = useState(fen)
  const [animKey, setAnimKey] = useState(0)
  if (prevFen !== fen) {
    setPrevFen(fen)
    setSelected(null)
    setDrag(null)
    setPromo(null)
    setAnimKey((k) => k + 1)
  }

  const canMove = movableColor !== null && chess.turn() === movableColor && !chess.isGameOver()
  const targets = useMemo(() => {
    if (!selected || !canMove) return new Map<string, boolean>()
    const m = new Map<string, boolean>()
    for (const mv of chess.moves({ square: selected, verbose: true })) m.set(mv.to, !!mv.captured)
    return m
  }, [selected, chess, canMove])

  const rows = orientation === 'w' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]
  const cols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]

  let checkSq: string | null = null
  if (chess.inCheck()) {
    for (const row of chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === chess.turn()) checkSq = p.square
  }

  // screen position (column/row index) of a square
  function pos(sq: string) {
    const f = FILES.indexOf(sq[0])
    const r = Number(sq[1]) - 1
    return { c: cols.indexOf(f), r: rows.indexOf(r) }
  }

  function squareAt(clientX: number, clientY: number): Square | null {
    const rc = boardRef.current?.getBoundingClientRect()
    if (!rc) return null
    const c = Math.floor(((clientX - rc.left) / rc.width) * 8)
    const r = Math.floor(((clientY - rc.top) / rc.height) * 8)
    if (c < 0 || c > 7 || r < 0 || r > 7) return null
    return (FILES[cols[c]] + (rows[r] + 1)) as Square
  }

  function tryMove(from: Square, to: Square): boolean {
    const moves = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to)
    if (moves.length === 0) return false
    if (moves.some((m) => m.promotion)) {
      setPromo({ from, to })
    } else {
      onMove?.(from, to)
    }
    setSelected(null)
    return true
  }

  function onPointerDown(e: React.PointerEvent) {
    const sq = squareAt(e.clientX, e.clientY)
    if (!sq) return
    if (!canMove) {
      onSquareTap?.(sq)
      return
    }
    if (promo) return
    const piece = chess.get(sq)
    if (selected && sq !== selected && targets.has(sq)) {
      draggedTo.current = null
      tryMove(selected, sq)
      return
    }
    if (piece && piece.color === movableColor) {
      wasSelected.current = selected === sq
      setSelected(sq)
      setRect(boardRef.current?.getBoundingClientRect() ?? null)
      setDrag({ from: sq, x: e.clientX, y: e.clientY, moved: false })
      boardRef.current?.setPointerCapture(e.pointerId)
    } else {
      setSelected(null)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return
    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved })
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag) return
    const sq = squareAt(e.clientX, e.clientY)
    const from = drag.from
    setDrag(null)
    if (sq && sq !== from) {
      draggedTo.current = drag.moved ? sq : null
      if (!tryMove(from, sq)) setSelected(null)
    } else if (sq === from && wasSelected.current && !drag.moved) {
      setSelected(null)
    }
  }

  const sqSize = rect ? rect.width / 8 : 0
  const dragPiece = drag?.moved ? chess.get(drag.from) : null

  // slide animation for the last move (skipped when the piece was dragged there)
  let anim: { to: string; dx: number; dy: number } | null = null
  if (s.animation && lastMove && draggedTo.current !== lastMove.to) {
    const a = pos(lastMove.from)
    const b = pos(lastMove.to)
    anim = { to: lastMove.to, dx: (a.c - b.c) * 100, dy: (a.r - b.r) * 100 }
  }

  const style = {
    '--sq-light': theme.light,
    '--sq-dark': theme.dark,
    backgroundImage: `url(${boardUrl(theme.id)})`,
    '--slide': s.animSpeed === 'schnell' ? '0.09s' : s.animSpeed === 'langsam' ? '0.32s' : '0.17s',
  } as React.CSSProperties

  return (
    <div
      className="board"
      ref={boardRef}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      {rows.map((r, ri) =>
        cols.map((c, ci) => {
          const sq = (FILES[c] + (r + 1)) as Square
          const piece = chess.get(sq)
          const light = (r + c) % 2 === 1
          const classes = ['sq', light ? 'light' : 'dark']
          if (lastMove && (lastMove.from === sq || lastMove.to === sq)) classes.push('last')
          if (selected === sq) classes.push('selected')
          if (hint && (hint.from === sq || hint.to === sq)) classes.push('hint')
          if (checkSq === sq) classes.push('check')
          if (marks?.[sq]) classes.push(marks[sq])
          const isTarget = targets.has(sq)
          const hidden = dragPiece && drag?.from === sq
          const animate = anim && anim.to === sq
          return (
            <div key={sq} className={classes.join(' ')}>
              {coords && ci === 0 && <span className="coord rank">{r + 1}</span>}
              {coords && ri === 7 && <span className="coord file">{FILES[c]}</span>}
              {piece && !hidden && (
                <img
                  key={animate ? `a${animKey}` : 'p'}
                  className={'piece' + (animate ? ' slide' : '')}
                  style={animate ? ({ '--dx': `${anim!.dx}%`, '--dy': `${anim!.dy}%` } as React.CSSProperties) : undefined}
                  src={pieceUrl(piece.color, piece.type, s.pieceSet)}
                  alt=""
                  draggable={false}
                />
              )}
              {isTarget && <span className={targets.get(sq) ? 'capture-ring' : 'dot'} />}
            </div>
          )
        }),
      )}
      {arrows && arrows.length > 0 && (
        <svg className="arrows" viewBox="0 0 8 8" aria-hidden="true">
          {arrows.map((a, i) => {
            const p1 = pos(a.from)
            const p2 = pos(a.to)
            const x1 = p1.c + 0.5, y1 = p1.r + 0.5, x2 = p2.c + 0.5, y2 = p2.r + 0.5
            const len = Math.hypot(x2 - x1, y2 - y1)
            const ux = (x2 - x1) / len, uy = (y2 - y1) / len
            const head = 0.42
            // shaft stops at the arrow head; start a little outside the piece centre
            const sx = x1 + ux * 0.22, sy = y1 + uy * 0.22
            const ex = x2 - ux * head, ey = y2 - uy * head
            const px = -uy * 0.24, py = ux * 0.24
            return (
              <g key={i} className={'arrow ' + (a.color ?? 'good')}>
                <line x1={sx} y1={sy} x2={ex} y2={ey} strokeWidth={0.17} strokeLinecap="round" />
                <polygon points={`${x2 - ux * 0.08},${y2 - uy * 0.08} ${ex + px},${ey + py} ${ex - px},${ey - py}`} />
              </g>
            )
          })}
        </svg>
      )}
      {dragPiece && drag && rect && (
        <img
          className="piece dragging"
          src={pieceUrl(dragPiece.color, dragPiece.type, s.pieceSet)}
          alt=""
          style={{
            width: sqSize * 1.15,
            height: sqSize * 1.15,
            left: drag.x - rect.left - sqSize * 0.575,
            top: drag.y - rect.top - sqSize * 0.575,
          }}
        />
      )}
      {promo && (
        <div className="promo-overlay" onPointerDown={(e) => { e.stopPropagation(); setPromo(null) }}>
          <div className="promo-box" onPointerDown={(e) => e.stopPropagation()}>
            {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  onMove?.(promo.from, promo.to, t)
                  setPromo(null)
                }}
              >
                <img src={pieceUrl(movableColor ?? 'w', t, s.pieceSet)} alt={t} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
