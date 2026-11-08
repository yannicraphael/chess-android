import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import { notate } from './chessText'
import { joinList, L, t } from '../i18n'

// Explains in words why a move was a mistake: what the opponent can do now,
// and what the better move would have achieved. Uses only the engine moves that the
// analysis already has (best move before and the opponent's best reply after).

export type Motif = 'matt' | 'haengend' | 'gabel' | 'verpasst' | 'sonstige'
// priority when several apply
const MOTIF_ORDER: Motif[] = ['matt', 'haengend', 'gabel', 'verpasst', 'sonstige']

export const MOTIF_LABELS: Record<Motif, string> = L<Record<Motif, string>>({
  matt: 'Matt übersehen',
  haengend: 'Figur hängen gelassen',
  gabel: 'Gabel übersehen',
  verpasst: 'Gewinn verpasst',
  sonstige: 'Stellungsfehler',
})

// older mistakes were saved without a motif: derive it from the stored explanation
export function motifFromText(why: string | undefined): Motif {
  const t = why ?? ''
  if (/matt|Matt/.test(t)) return 'matt'
  if (/nicht gedeckt|angegriffen war|steht auf .* schlecht|nicht genug gedeckt/.test(t)) return 'haengend'
  if (/Gabel|Doppelangriff/.test(t)) return /wäre eine Gabel/.test(t) ? 'verpasst' : 'gabel'
  if (/gratis|Material gewonnen|neue Dame/.test(t)) return 'verpasst'
  return 'sonstige'
}

const VAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }
const NOM: Record<PieceSymbol, string> = L({ p: 'dein Bauer', n: 'dein Springer', b: 'dein Läufer', r: 'dein Turm', q: 'deine Dame', k: 'dein König' })
const ACC: Record<PieceSymbol, string> = L({ p: 'deinen Bauern', n: 'deinen Springer', b: 'deinen Läufer', r: 'deinen Turm', q: 'deine Dame', k: 'deinen König' })
const THEIR: Record<PieceSymbol, string> = L({ p: 'einen Bauern', n: 'einen Springer', b: 'einen Läufer', r: 'einen Turm', q: 'die Dame', k: 'den König' })
const SUBJ: Record<PieceSymbol, string> = L({ p: 'Der Bauer', n: 'Der Springer', b: 'Der Läufer', r: 'Der Turm', q: 'Die Dame', k: 'Der König' })

function play(fen: string, uci: string | null): { chess: Chess; move: Move } | null {
  if (!uci) return null
  try {
    const chess = new Chess(fen)
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return move ? { chess, move } : null
  } catch {
    return null
  }
}


// pieces of `victim` attacked by the piece on `sq` that are worth taking (undefended or worth more)
function forkTargets(chess: Chess, sq: Square, victim: Color, withPawns = false) {
  const attacker = chess.get(sq)
  if (!attacker) return []
  const out: { type: PieceSymbol; square: Square }[] = []
  for (const row of chess.board()) for (const p of row) {
    if (!p || p.color !== victim) continue
    if (!chess.attackers(p.square, attacker.color).includes(sq)) continue
    const defended = chess.isAttacked(p.square, victim)
    if (p.type === 'k' || (!defended && (VAL[p.type] >= 3 || withPawns)) || (VAL[p.type] >= 3 && VAL[p.type] > VAL[attacker.type])) out.push({ type: p.type, square: p.square })
  }
  return out
}

// what the opponent's reply does to the player
function replyText(fenAfter: string, reply: string | null, me: Color, playedTo: string, attackedBefore: Set<string>): [string, Motif] | null {
  const r = play(fenAfter, reply)
  if (!r) return null
  const { chess, move } = r
  const san = notate(move.san)
  if (chess.isCheckmate()) return [t('Danach setzt der Gegner mit {san} sofort matt.', { san }), 'matt']
  if (move.captured) {
    const cap = move.captured!
    const free = !chess.isAttacked(move.to, me)
    if (free || VAL[cap] > VAL[move.piece]) {
      const what = free
        ? (cap === 'q' ? t('{san} schlägt {piece}, die nicht gedeckt war.', { san, piece: ACC[cap] }) : t('{san} schlägt {piece}, der nicht gedeckt war.', { san, piece: ACC[cap] }))
        : t('{san} gewinnt {piece} für {other}.', { san, piece: ACC[cap], other: THEIR[move.piece] })
      if (move.to === playedTo) return [t('{piece} steht auf {square} schlecht: {what}', { piece: NOM[cap].replace(/^./, (c) => c.toUpperCase()), square: move.to, what }), 'haengend']
      if (attackedBefore.has(move.to)) return [t('Du hast übersehen, dass {piece} auf {square} angegriffen war: {what}', { piece: NOM[cap], square: move.to, what }), 'haengend']
      return [what, 'haengend']
    }
  }
  const targets = forkTargets(chess, move.to, me, true)
  if (targets.length >= 2 && targets.some((t) => VAL[t.type] >= 3)) {
    const list = joinList(targets.sort((a, b) => VAL[b.type] - VAL[a.type]).map((x) => ACC[x.type]))
    const p = { san, piece: SUBJ[move.piece], targets: list }
    return [move.piece === 'n' || move.piece === 'p'
      ? t('{san} ist eine Gabel: {piece} greift {targets} gleichzeitig an.', p)
      : t('{san} ist ein Doppelangriff: {piece} greift {targets} gleichzeitig an.', p), 'gabel']
  }
  const hit = targets.find((t) => t.type !== 'k' && VAL[t.type] >= 3)
  if (hit) {
    const p = { san, piece: ACC[hit.type], square: hit.square }
    return [hit.type === 'q' ? t('{san} greift {piece} auf {square} an, die nicht genug gedeckt ist.', p) : t('{san} greift {piece} auf {square} an, der nicht genug gedeckt ist.', p), 'haengend']
  }
  if (chess.inCheck()) return [t('Der Gegner antwortet mit {san} und Schach und gewinnt danach Material oder Zeit.', { san }), 'sonstige']
  return [t('Der Gegner antwortet stark mit {san}.', { san }), 'sonstige']
}

// what the better move would have achieved
function bestText(fenBefore: string, best: string | null, mateBefore: number | null): [string, Motif] | null {
  const b = play(fenBefore, best)
  if (!b) return null
  const { chess, move } = b
  const san = notate(move.san)
  if (chess.isCheckmate()) return [t('{san} wäre sofort Matt gewesen.', { san }), 'matt']
  if (mateBefore !== null && mateBefore > 0) return [t('Mit {san} hattest du ein Matt in {n} Zügen.', { san, n: mateBefore }), 'matt']
  if (move.captured) {
    const free = !chess.isAttacked(move.to, chess.turn())
    if (free) return [t('Mit {san} hättest du {piece} gratis schlagen können.', { san, piece: THEIR[move.captured] }), 'verpasst']
    if (VAL[move.captured] > VAL[move.piece]) return [t('Mit {san} hättest du Material gewonnen.', { san }), 'verpasst']
  }
  const targets = forkTargets(chess, move.to, chess.turn())
  if (targets.length >= 2) return [t('{san} wäre eine Gabel gewesen.', { san }), 'verpasst']
  if (move.promotion) return [t('Mit {san} hättest du eine neue Dame bekommen.', { san }), 'verpasst']
  return [t('Besser war {san}.', { san }), 'sonstige']
}

export interface ExplainInput {
  fenBefore: string
  played: string // uci
  best: string | null // engine's best move before the played move
  reply: string | null // engine's best reply after the played move
  mateBefore: number | null // white view
  mateAfter: number | null // white view
}

export function explainMistake(x: ExplainInput): string {
  return analyzeMistake(x).text
}

// explanation plus the motif used to group the player's mistakes
export function analyzeMistake(x: ExplainInput): { text: string; motif: Motif } {
  const before = new Chess(x.fenBefore)
  const me = before.turn()
  const sign = me === 'w' ? 1 : -1
  const p = play(x.fenBefore, x.played)
  if (!p) return { text: '', motif: 'sonstige' }
  const fenAfter = p.chess.fen()
  // own pieces that were already under attack before the move
  const attackedBefore = new Set<string>()
  for (const row of before.board()) for (const pc of row) {
    if (pc && pc.color === me && pc.type !== 'k' && before.isAttacked(pc.square, me === 'w' ? 'b' : 'w')) attackedBefore.add(pc.square)
  }
  const parts: [string, Motif][] = []
  const mateAfter = x.mateAfter !== null ? x.mateAfter * sign : null
  const mateBefore = x.mateBefore !== null ? x.mateBefore * sign : null
  if (mateAfter !== null && mateAfter < 0 && Math.abs(mateAfter) > 1) {
    const r = play(fenAfter, x.reply)
    const n = Math.abs(mateAfter)
    parts.push([r ? t('Jetzt hat der Gegner ein Matt in {n} Zügen, beginnend mit {san}.', { n, san: notate(r.move.san) }) : t('Jetzt hat der Gegner ein Matt in {n} Zügen.', { n }), 'matt'])
  } else {
    const t = replyText(fenAfter, x.reply, me, p.move.to, attackedBefore)
    if (t) parts.push(t)
  }
  if (x.best && x.best !== x.played) {
    const t = bestText(x.fenBefore, x.best, mateBefore)
    if (t) parts.push(t)
  }
  const motifs = parts.map((q) => q[1])
  const motif = MOTIF_ORDER.find((m) => motifs.includes(m)) ?? 'sonstige'
  return { text: parts.map((q) => q[0]).join(' '), motif }
}
