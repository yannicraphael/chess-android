import { Chess, type PieceSymbol } from 'chess.js'
import { decimal, fmtSan, t } from '../i18n'

// Converts English SAN (Nf3) into the notation of the app language (German Sf3, Spanish Cf3)
export const notate = (san: string) => fmtSan(san)

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: t('Bauer'), n: t('Springer'), b: t('Läufer'), r: t('Turm'), q: t('Dame'), k: t('König'),
}
export const PIECE_ACC: Record<PieceSymbol, string> = {
  p: t('deinen Bauern'), n: t('deinen Springer'), b: t('deinen Läufer'), r: t('deinen Turm'), q: t('deine Dame'), k: t('deinen König'),
}

export const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

export function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen)
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return m ? notate(m.san) : null
  } catch {
    return null
  }
}

// Evaluation in pawns as text, from white's point of view: "+1,4", "−0,3", "M3"
export function evalText(cp: number, mate: number | null): string {
  if (mate !== null) return `${mate > 0 ? '' : '−'}M${Math.abs(mate)}`
  const v = decimal((cp / 100).toFixed(1))
  return cp > 0 ? `+${v}` : cp < 0 ? `−${v.slice(1)}` : decimal('0.0')
}

// "1.e4 e5 2.Sf3" from English SAN moves, starting at ply `start`
export function moveText(moves: string[], start = 0) {
  return moves.map((m, i) => {
    const ply = start + i
    const n = Math.floor(ply / 2) + 1
    const san = notate(m)
    if (ply % 2 === 0) return `${n}.${san}`
    return i === 0 ? `${n}...${san}` : san
  }).join(' ')
}
