import { Chess, type Color } from 'chess.js'
import { useMemo } from 'react'
import Board, { type Arrow, type SquarePair } from './Board'

// A small, non-interactive position picture: from a FEN or from a move list (English SAN)
export default function Diagram({ fen, moves, orientation, arrows, caption, small }: {
  fen?: string
  moves?: string
  orientation: Color
  arrows?: Arrow[]
  caption?: string
  small?: boolean
}) {
  const pos = useMemo(() => {
    if (!moves) return { fen: fen ?? new Chess().fen(), last: null as SquarePair | null }
    const c = new Chess(fen)
    let last: SquarePair | null = null
    for (const m of moves.split(' ').filter(Boolean)) { const mv = c.move(m); last = { from: mv.from, to: mv.to } }
    return { fen: c.fen(), last }
  }, [fen, moves])
  return (
    <figure className={'diagram' + (small ? ' small' : '')}>
      <div className="diagram-board"><Board fen={pos.fen} orientation={orientation} lastMove={pos.last} arrows={arrows} showCoords /></div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
