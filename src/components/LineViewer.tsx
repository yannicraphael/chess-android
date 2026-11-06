import { Chess, type Color } from 'chess.js'
import { useMemo, useState } from 'react'
import { de } from '../lib/chessText'
import Board from './Board'
import Icon from './Icon'

// Click through a line move by move, with the explanation of each move
export default function LineViewer({ moves, notes, orientation }: { moves: string[]; notes: string[]; orientation: Color }) {
  const [ply, setPly] = useState(0)
  const steps = useMemo(() => {
    const c = new Chess()
    const out = [{ fen: c.fen(), last: null as { from: string; to: string } | null, san: '' }]
    for (const m of moves) { const mv = c.move(m); out.push({ fen: c.fen(), last: { from: mv.from, to: mv.to }, san: mv.san }) }
    return out
  }, [moves])
  const cur = steps[ply]
  const text = ply === 0 ? 'Die Ausgangsstellung. Tippe auf „Weiter“ oder auf einen Zug.' : notes[ply - 1]
  const num = ply === 0 ? '' : `${Math.floor((ply - 1) / 2) + 1}.${ply % 2 === 0 ? '..' : ''}${de(cur.san)}`
  return (
    <div className="line-viewer">
      <div className="lv-board"><Board fen={cur.fen} orientation={orientation} lastMove={cur.last} showCoords /></div>
      <div className="lv-note"><strong>{num}</strong> {text}</div>
      <div className="lv-controls">
        <button className="icon-btn" onClick={() => setPly(0)} disabled={ply === 0} aria-label="Anfang"><Icon name="refresh" /></button>
        <button className="btn secondary small" onClick={() => setPly(Math.max(0, ply - 1))} disabled={ply === 0}><Icon name="back" /> Zurück</button>
        <button className="btn primary small" onClick={() => setPly(Math.min(moves.length, ply + 1))} disabled={ply === moves.length}>Weiter <Icon name="next" /></button>
      </div>
      <div className="lv-moves">
        {moves.map((_, i) => (
          <button key={i} className={'lv-move' + (i + 1 === ply ? ' active' : '')} onClick={() => setPly(i + 1)}>
            {i % 2 === 0 && <span className="lv-num">{i / 2 + 1}.</span>}{de(steps[i + 1].san)}
          </button>
        ))}
      </div>
    </div>
  )
}
