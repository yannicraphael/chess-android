import { Chess, type PieceSymbol } from 'chess.js'

const GERMAN: Record<string, string> = { N: 'S', B: 'L', R: 'T', Q: 'D', K: 'K' }

// Converts English SAN (Nf3) into German notation (Sf3)
export const de = (san: string) => san.replace(/[NBRQK]/g, (c) => GERMAN[c])

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König',
}
export const PIECE_ACC: Record<PieceSymbol, string> = {
  p: 'deinen Bauern', n: 'deinen Springer', b: 'deinen Läufer', r: 'deinen Turm', q: 'deine Dame', k: 'deinen König',
}

export const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

export function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen)
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return m ? de(m.san) : null
  } catch {
    return null
  }
}

// Evaluation in pawns as text, from white's point of view: "+1,4", "−0,3", "M3"
export function evalText(cp: number, mate: number | null): string {
  if (mate !== null) return `${mate > 0 ? '' : '−'}M${Math.abs(mate)}`
  const v = (cp / 100).toFixed(1).replace('.', ',')
  return cp > 0 ? `+${v}` : cp < 0 ? `−${v.slice(1)}` : '0,0'
}
