import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js'
import { useMemo, useRef, useState } from 'react'
import './Board.css'

export interface SquarePair {
  from: string
  to: string
}

interface Props {
  fen: string
  orientation: Color
  movableColor: Color | null // null = no moves allowed
  lastMove?: SquarePair | null
  hint?: SquarePair | null
  onMove: (from: string, to: string, promotion?: PieceSymbol) => void
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

export function pieceUrl(color: Color, type: PieceSymbol) {
  return `${import.meta.env.BASE_URL}pieces/${color}${type.toUpperCase()}.svg`
}

export default function Board({ fen, orientation, movableColor, lastMove, hint, onMove }: Props) {
  const chess = useMemo(() => new Chess(fen), [fen])
  const boardRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Square | null>(null)
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number; moved: boolean } | null>(null)
  const [promo, setPromo] = useState<SquarePair | null>(null)
  const wasSelected = useRef(false)

  // reset selection whenever the position changes
  const [prevFen, setPrevFen] = useState(fen)
  if (prevFen !== fen) {
    setPrevFen(fen)
    setSelected(null)
    setDrag(null)
    setPromo(null)
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

  function squareAt(clientX: number, clientY: number): Square | null {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return null
    const c = Math.floor(((clientX - rect.left) / rect.width) * 8)
    const r = Math.floor(((clientY - rect.top) / rect.height) * 8)
    if (c < 0 || c > 7 || r < 0 || r > 7) return null
    return (FILES[cols[c]] + (rows[r] + 1)) as Square
  }

  function tryMove(from: Square, to: Square): boolean {
    const moves = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to)
    if (moves.length === 0) return false
    if (moves.some((m) => m.promotion)) {
      setPromo({ from, to })
    } else {
      onMove(from, to)
    }
    setSelected(null)
    return true
  }

  function onPointerDown(e: React.PointerEvent) {
    if (promo || !canMove) return
    const sq = squareAt(e.clientX, e.clientY)
    if (!sq) return
    const piece = chess.get(sq)
    if (selected && sq !== selected && targets.has(sq)) {
      tryMove(selected, sq)
      return
    }
    if (piece && piece.color === movableColor) {
      wasSelected.current = selected === sq
      setSelected(sq)
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
      if (!tryMove(from, sq)) setSelected(null)
    } else if (sq === from && wasSelected.current && !drag.moved) {
      setSelected(null)
    }
  }

  const rect = boardRef.current?.getBoundingClientRect()
  const sqSize = rect ? rect.width / 8 : 0
  const dragPiece = drag?.moved ? chess.get(drag.from) : null

  return (
    <div
      className="board"
      ref={boardRef}
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
          const isTarget = targets.has(sq)
          const hidden = dragPiece && drag?.from === sq
          return (
            <div key={sq} className={classes.join(' ')}>
              {ci === 0 && <span className="coord rank">{r + 1}</span>}
              {ri === 7 && <span className="coord file">{FILES[c]}</span>}
              {piece && !hidden && <img className="piece" src={pieceUrl(piece.color, piece.type)} alt="" draggable={false} />}
              {isTarget && <span className={targets.get(sq) ? 'capture-ring' : 'dot'} />}
            </div>
          )
        }),
      )}
      {dragPiece && drag && rect && (
        <img
          className="piece dragging"
          src={pieceUrl(dragPiece.color, dragPiece.type)}
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
                  onMove(promo.from, promo.to, t)
                  setPromo(null)
                }}
              >
                <img src={pieceUrl(movableColor ?? 'w', t)} alt={t} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
