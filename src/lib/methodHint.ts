import { Chess, type Color, type Move, type Square } from 'chess.js'

// Tips for the basic mates that follow the method from the theory page instead of the engine's
// shortest mate. The engine often brings the king first, while the method says: first push the
// king to the edge with the queen (or rooks), then bring your own king.

export interface MethodHint { from: string; to: string; text: string }

const FILES = 'abcdefgh'
const fileOf = (sq: string) => FILES.indexOf(sq[0])
const rankOf = (sq: string) => Number(sq[1]) - 1
const sqName = (f: number, r: number) => FILES[f] + (r + 1)
const dist = (a: string, b: string) => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)))
const onEdge = (sq: string) => [0, 7].includes(fileOf(sq)) || [0, 7].includes(rankOf(sq))
const knightApart = (a: string, b: string) => {
  const df = Math.abs(fileOf(a) - fileOf(b)), dr = Math.abs(rankOf(a) - rankOf(b))
  return (df === 1 && dr === 2) || (df === 2 && dr === 1)
}

function find(c: Chess, color: Color, type: string): string[] {
  return c.board().flat().filter((p) => p && p.color === color && p.type === type).map((p) => p!.square)
}

// squares the attacker controls, with the defending king taken off the board
// (so a rook or queen line also covers the squares behind the king)
function controlled(c: Chess, me: Color): Set<string> {
  const out = new Set<string>()
  const occupied = new Set<string>(c.board().flat().filter((p) => p && !(p.color !== me && p.type === 'k')).map((p) => p!.square))
  for (const p of c.board().flat()) {
    if (!p || p.color !== me) continue
    const f = fileOf(p.square), r = rankOf(p.square)
    const dirs: [number, number][] = []
    if (p.type === 'k') {
      for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) if (df || dr) { const nf = f + df, nr = r + dr; if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.add(sqName(nf, nr)) }
      continue
    }
    if (p.type === 'r' || p.type === 'q') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1])
    if (p.type === 'q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1])
    for (const [df, dr] of dirs) {
      let nf = f + df, nr = r + dr
      while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        const s = sqName(nf, nr)
        out.add(s)
        if (occupied.has(s)) break
        nf += df; nr += dr
      }
    }
  }
  return out
}

// the squares the defending king can still reach: the size of its "box"
function box(c: Chess, me: Color): string[] {
  const them: Color = me === 'w' ? 'b' : 'w'
  const k = find(c, them, 'k')[0]
  const ctl = controlled(c, me)
  const mine = new Set<string>(c.board().flat().filter((p) => p && p.color === me).map((p) => p!.square))
  const seen = new Set([k])
  const todo = [k]
  while (todo.length) {
    const s = todo.pop()!
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
      const nf = fileOf(s) + df, nr = rankOf(s) + dr
      if ((!df && !dr) || nf < 0 || nf > 7 || nr < 0 || nr > 7) continue
      const n = sqName(nf, nr)
      if (seen.has(n) || ctl.has(n) || mine.has(n)) continue
      seen.add(n); todo.push(n)
    }
  }
  return [...seen]
}

// a piece of mine that the defending king could take
function hanging(c: Chess, me: Color): string | null {
  const them: Color = me === 'w' ? 'b' : 'w'
  const k = find(c, them, 'k')[0]
  for (const p of c.board().flat()) {
    if (!p || p.color !== me || p.type === 'k') continue
    if (dist(p.square, k) === 1 && !c.isAttacked(p.square as Square, me)) return p.square
  }
  return null
}

interface Cand { m: Move; c: Chess; area: number; boxSq: string[] }

function candidates(c: Chess, me: Color, filter: (m: Move) => boolean): Cand[] {
  const out: Cand[] = []
  for (const m of c.moves({ verbose: true })) {
    if (!filter(m)) continue
    const n = new Chess(c.fen())
    n.move(m)
    if (n.isStalemate() || n.isInsufficientMaterial()) continue
    if (n.isCheckmate()) { out.push({ m, c: n, area: 0, boxSq: [] }); continue }
    if (hanging(n, me)) continue
    const b = box(n, me)
    out.push({ m, c: n, area: b.length, boxSq: b })
  }
  return out
}

const best = <T,>(xs: T[], key: (x: T) => number[]) => {
  let r: T | null = null, rk: number[] = []
  for (const x of xs) {
    const k = key(x)
    let better = r === null
    if (!better) for (let i = 0; i < k.length; i++) { if (k[i] !== rk[i]) { better = k[i] < rk[i]; break } }
    if (better) { r = x; rk = k }
  }
  return r
}

const out = (m: Move, text: string): MethodHint => ({ from: m.from, to: m.to, text })

function mateInOne(c: Chess): Move | null {
  for (const m of c.moves({ verbose: true })) {
    const n = new Chess(c.fen()); n.move(m)
    if (n.isCheckmate()) return m
  }
  return null
}

// a rook that the king cannot attack next move: far away or defended
function safeFrom(x: Cand, me: Color, bk: string) {
  return x.area === 0 || dist(x.m.to, bk) >= 3 || x.c.isAttacked(x.m.to as Square, me)
}

const key = (fen: string) => fen.split(' ').slice(0, 2).join(' ')

// ---------- tablebase (king + queen or rook against king) ----------
// plies to mate with the lone king to move, 255 = draw. Built by scripts/build-tablebase.mjs.
export type Table = Uint8Array
const sq64 = (s: string) => fileOf(s) + 8 * rankOf(s)
function dtm(tb: Table, c: Chess, me: Color, piece: 'q' | 'r'): number {
  const them: Color = me === 'w' ? 'b' : 'w'
  if (c.isCheckmate()) return 0
  const p = find(c, me, piece)[0]
  if (!p || c.turn() !== them) return 255
  return tb[sq64(find(c, me, 'k')[0]) * 4096 + sq64(p) * 64 + sq64(find(c, them, 'k')[0])]
}

interface Scored extends Cand { d: number }
function scored(c: Chess, me: Color, tb: Table, piece: 'q' | 'r'): Scored[] {
  return candidates(c, me, () => true).map((x) => ({ ...x, d: dtm(tb, x.c, me, piece) })).filter((x) => x.d < 255)
}

// king and queen: queen in knight distance until the king is stuck on the edge, then the king comes
function queenHint(c: Chess, me: Color, tb: Table, seen: Set<string>): MethodHint | null {
  const them: Color = me === 'w' ? 'b' : 'w'
  const bk = find(c, them, 'k')[0]
  if (!find(c, me, 'q').length) return null
  const mate = mateInOne(c)
  if (mate) return out(mate, 'Schritt 4: Jetzt ist es Matt.')
  const all = scored(c, me, tb, 'q')
  if (!all.length) return null
  const bestD = Math.min(...all.map((x) => x.d))
  const optimal = all.filter((x) => x.d === bestD)
  const cur = box(c, me)
  if (hanging(c, me)) {
    const flee = best(optimal.filter((x) => x.m.piece === 'q'), (x) => [x.d]) ?? best(optimal, (x) => [x.d])!
    return out(flee.m, 'Deine Dame steht ungedeckt neben dem König. Bring sie in Sicherheit, ohne den König freizulassen.')
  }
  if (onEdge(bk) && sameEdge(cur)) {
    // step 3: no more queen moves, bring the king until it faces the other king
    const k = best(optimal.filter((x) => x.m.piece === 'k'), (x) => [dist(x.m.to, inward(bk))])
    if (k) return out(k.m, 'Schritt 3: Der König steht am Rand. Jetzt keine Damenzüge mehr: Hole deinen König heran, bis er dem anderen König gegenübersteht.')
    const q = best(optimal, (x) => [x.area])!
    return out(q.m, 'Dein König steht fast bereit. Ein ruhiger Damenzug hält den König am Rand fest, dann muss er ziehen.')
  }
  // steps 1 and 2: the queen a knight's move away from the king, the rectangle shrinks
  const shrink = best(all.filter((x) => x.m.piece === 'q' && x.area < cur.length), (x) => [knightApart(x.m.to, bk) ? 0 : 1, x.d, x.area])
  if (shrink) return out(shrink.m, knightApart(shrink.m.to, bk)
    ? 'Schritt 1 und 2: Die Dame geht einen Springerzug vom König entfernt. So wird sein Rechteck kleiner.'
    : 'Schritt 1 und 2: Die Dame macht das Rechteck des Königs kleiner. Achte darauf, dass er noch ein Feld hat (kein Patt).')
  // step 2: follow the king with the queen in knight distance (without repeating a position)
  const follow = best(all.filter((x) => x.m.piece === 'q' && x.area <= cur.length && knightApart(x.m.to, bk) && x.d <= bestD + 4 && !seen.has(key(x.c.fen()))), (x) => [x.area, x.d])
  if (follow) return out(follow.m, 'Schritt 2: Folge dem König mit der Dame, wieder im Springerabstand.')
  const o = best(optimal, (x) => [x.m.piece === 'q' ? 0 : 1, x.area])!
  return out(o.m, o.m.piece === 'k'
    ? 'Das Rechteck kann gerade nicht kleiner werden. Hole deinen König heran, damit die Dame weiter drücken kann.'
    : 'Folge dem König mit der Dame im Springerabstand.')
}

// all squares of the box lie on one edge line
function sameEdge(sqs: string[]) {
  if (!sqs.length) return false
  return [0, 7].some((e) => sqs.every((s) => rankOf(s) === e)) || [0, 7].some((e) => sqs.every((s) => fileOf(s) === e))
}

// the square two steps from the edge king towards the centre: where my king faces it
function inward(bk: string) {
  let f = fileOf(bk), r = rankOf(bk)
  if (r === 7) r = 5; else if (r === 0) r = 2
  else if (f === 7) f = 5; else if (f === 0) f = 2
  return sqName(f, r)
}

// king and rook: box, king approach, check in opposition, waiting move
function rookHint(c: Chess, me: Color, tb: Table): MethodHint | null {
  const them: Color = me === 'w' ? 'b' : 'w'
  const bk = find(c, them, 'k')[0]
  const rook = find(c, me, 'r')[0]
  if (!rook) return null
  const mate = mateInOne(c)
  if (mate) return out(mate, 'Schritt 5: Die Könige stehen in Opposition am Rand. Das Turmschach ist Matt.')
  const all = scored(c, me, tb, 'r')
  if (!all.length) return null
  const bestD = Math.min(...all.map((x) => x.d))
  const optimal = all.filter((x) => x.d === bestD)
  const cur = box(c, me).length
  // kings on one line with one square between them
  const myK = find(c, me, 'k')[0]
  const opposition = (fileOf(myK) === fileOf(bk) && Math.abs(rankOf(myK) - rankOf(bk)) === 2) || (rankOf(myK) === rankOf(bk) && Math.abs(fileOf(myK) - fileOf(bk)) === 2)
  if (hanging(c, me)) {
    const flee = best(optimal, (x) => [x.m.piece === 'r' ? 0 : 1])!
    return out(flee.m, flee.m.piece === 'r'
      ? 'Dein Turm steht ungedeckt neben dem König. Zieh ihn weit weg, die Box bleibt.'
      : 'Dein Turm wird angegriffen. Decke ihn mit dem König.')
  }
  // every tip is a best move (so it always leads to mate), chosen in the order of the method:
  // steps 1 and 3: a rook move that makes the box smaller (in opposition: the check)
  const shrink = best(optimal.filter((x) => x.m.piece === 'r' && x.area < cur && safeFrom(x, me, bk)), (x) => [x.area])
  if (shrink) return out(shrink.m, shrink.c.inCheck() && opposition
    ? 'Schritt 3: Die Könige stehen in Opposition. Jetzt gibt der Turm Schach und der König muss eine Reihe zurück.'
    : 'Schritt 1: Der Turm macht die Box kleiner. Der König kommt nicht über die Sperrlinie.')
  const o = best(optimal, (x) => [x.m.piece === 'k' ? 0 : 1, x.area])!
  if (o.m.piece === 'k') return out(o.m, 'Schritt 2: Dein König geht auf den gegnerischen König zu, bis sie sich gegenüberstehen.')
  if (o.c.inCheck()) return out(o.m, opposition ? 'Schritt 3: Die Könige stehen in Opposition. Jetzt gibt der Turm Schach.' : 'Ein Turmschach treibt den König zurück. Die Box wird nicht größer.')
  if (fileOf(o.m.to) === fileOf(rook) || rankOf(o.m.to) === rankOf(rook)) {
    if (o.area <= cur) return out(o.m, 'Schritt 4: Keine Opposition. Mache einen Wartezug mit dem Turm entlang der Sperrlinie, dann muss der König ziehen.')
  }
  return out(o.m, 'Stelle den Turm auf eine bessere Sperrlinie, weit weg vom König.')
}

// two rooks: the ladder. One rook cuts a line, the other checks on the next one.
// Works in a frame where the king is pushed "up" (to the 8th rank); other directions are mirrored.
function rooksHint(c: Chess, me: Color): MethodHint | null {
  const them: Color = me === 'w' ? 'b' : 'w'
  const mate = mateInOne(c)
  if (mate) return out(mate, 'Matt: Der eine Turm sperrt die Reihe davor, der andere gibt Schach am Rand.')
  const bk = find(c, them, 'k')[0]
  const rooks = find(c, me, 'r')
  if (rooks.length < 2) return null
  // frames: map a real square to (x, y) where the king is pushed towards y = 7
  const frames = [
    { to: (s: string) => [fileOf(s), rankOf(s)], back: (x: number, y: number) => sqName(x, y) },
    { to: (s: string) => [fileOf(s), 7 - rankOf(s)], back: (x: number, y: number) => sqName(x, 7 - y) },
    { to: (s: string) => [rankOf(s), fileOf(s)], back: (x: number, y: number) => sqName(y, x) },
    { to: (s: string) => [rankOf(s), 7 - fileOf(s)], back: (x: number, y: number) => sqName(7 - y, x) },
  ]
  const legal = new Map(c.moves({ verbose: true }).map((m) => [m.from + m.to, m]))
  const ok = (from: string, to: string) => {
    const m = legal.get(from + to)
    if (!m) return null
    const n = new Chess(c.fen()); n.move(m)
    if (n.isStalemate() || hanging(n, me)) return null
    return m
  }
  // no piece on the straight path between two squares (frame coordinates, end squares excluded)
  const clearPath = (F: (typeof frames)[number], x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1)
    for (let x = x1 + dx, y = y1 + dy; x !== x2 || y !== y2; x += dx, y += dy) if (c.get(F.back(x, y) as Square)) return false
    return true
  }
  // the frame where the king is nearest to the edge, preferring one where a rook already cuts
  const myKing = find(c, me, 'k')[0]
  const ranked = frames.map((F) => {
    const [, by] = F.to(bk)
    const cut = rooks.some((r) => F.to(r)[1] === by - 1)
    // my own king on the cut line or the check line gets in the way of the rooks
    const ky = F.to(myKing)[1]
    const blocked = ky === by || ky === by - 1
    return { F, by, score: (7 - by) * 2 - (cut ? 1 : 0) + (blocked ? 3 : 0) }
  }).filter((x) => x.by >= 1).sort((a, b) => a.score - b.score)
  for (const { F, by } of ranked) {
    const [bx] = F.to(bk)
    const far = (x: number) => Math.abs(x - bx)
    const cutRook = rooks.find((r) => F.to(r)[1] === by - 1)
    const other = rooks.find((r) => r !== cutRook)!
    if (cutRook) {
      const [cx] = F.to(cutRook)
      // the king attacks the cutting rook: move it to the far end of its line
      if (far(cx) <= 1) {
        const ends = [0, 7].sort((a, b) => far(b) - far(a))
        for (const x of ends) { const m = ok(cutRook, F.back(x, by - 1)); if (m) return out(m, 'Der König kommt deinem Turm zu nahe. Zieh ihn weit weg ans andere Ende der Linie, die Sperre bleibt.') }
      }
      // the other rook checks on the king's line, far away from it
      const [ox, oy] = F.to(other)
      // a check from column x along the king's line must not be blocked by my king
      const myK = F.to(find(c, me, 'k')[0])
      const clear = (x: number) => !(myK[1] === by && (myK[0] - x) * (myK[0] - bx) < 0)
      if (far(ox) >= 2 && clear(ox)) { const m = ok(other, F.back(ox, by)); if (m) return out(m, 'Treppe: Ein Turm sperrt, der andere gibt auf der nächsten Linie Schach. Der König muss eine Reihe zurück.') }
      // first bring the other rook to a file far from the king
      const xs = [0, 7, 1, 6].filter((x) => far(x) >= 2 && clear(x) && x !== ox && !c.get(F.back(x, by) as Square) && clearPath(F, x, oy, x, by)).sort((a, b) => far(b) - far(a))
      for (const x of xs) { const m = ok(other, F.back(x, oy)); if (m) return out(m, 'Bring den zweiten Turm auf eine Linie weit weg vom König. Von dort gibt er gleich Schach.') }
    } else {
      // no rook cuts yet: one rook goes to the line in front of the king
      // the rook that is not cutting yet moves up, so the rooks take turns (the ladder)
      const order = [...rooks].sort((a, b) => Math.abs(F.to(b)[1] - (by - 1)) - Math.abs(F.to(a)[1] - (by - 1)))
      for (const r of order) {
        const [rx] = F.to(r)
        if (far(rx) >= 2) { const m = ok(r, F.back(rx, by - 1)); if (m) return out(m, 'Ein Turm sperrt die Linie vor dem König ab. Abwechselnd rücken die Türme so Linie für Linie vor.') }
      }
      for (const r of rooks) {
        const [rx, ry] = F.to(r)
        for (const x of [0, 7, 1, 6].filter((x) => far(x) >= 2 && x !== rx).sort((a, b) => far(b) - far(a))) {
          if (c.get(F.back(x, by - 1) as Square) || !clearPath(F, x, ry, x, by - 1)) continue
          const m = ok(r, F.back(x, ry)); if (m) return out(m, 'Bring den Turm zuerst weit weg vom König, damit er die Linie vor ihm sperren kann.')
        }
      }
    }
  }
  // fallback: any safe rook move far away from the king
  const any = best(candidates(c, me, (m) => m.piece === 'r').filter((x) => safeFrom(x, me, bk)), (x) => [x.area, -dist(x.m.to, bk)])
  return any ? out(any.m, 'Bring den Turm weit weg vom König auf eine freie Linie.') : null
}

const tables: Partial<Record<'q' | 'r', Promise<Table>>> = {}
// loads the tablebase a method tip needs (fetched once)
export function loadTable(endgameId: string, base = ''): Promise<Table | null> {
  const t = endgameId === 'dame' ? 'q' : endgameId === 'turm' ? 'r' : null
  if (!t) return Promise.resolve(null)
  tables[t] ??= fetch(`${base}tb/k${t}k.bin`).then((r) => r.arrayBuffer()).then((b) => new Uint8Array(b))
  return tables[t]!
}

export function hasMethodHint(endgameId: string) {
  return endgameId === 'dame' || endgameId === 'turm' || endgameId === 'tuerme'
}

// `seen`: positions of this game so far (FEN). The two-rook ladder avoids going round in circles.
export function methodHint(endgameId: string, fen: string, tb: Table | null, seen: string[] = []): MethodHint | null {
  const c = new Chess(fen)
  const me = c.turn()
  if (endgameId === 'dame' && tb) return queenHint(c, me, tb, new Set(seen.map(key)))
  if (endgameId === 'turm' && tb) return rookHint(c, me, tb)
  if (endgameId === 'tuerme') {
    const h = rooksHint(c, me)
    const old = new Set(seen.map(key))
    const after = (m: { from: string; to: string }) => { const n = new Chess(fen); n.move(m); return key(n.fen()) }
    if (!h || !old.has(after(h))) return h
    // the ladder would repeat a position: take another safe rook move that makes progress
    const bk = find(c, me === 'w' ? 'b' : 'w', 'k')[0]
    const alt = best(candidates(c, me, (m) => m.piece === 'r').filter((x) => safeFrom(x, me, bk) && !old.has(key(x.c.fen()))), (x) => [x.area, x.c.inCheck() ? 0 : 1, -dist(x.m.to, bk)])
    return alt ? out(alt.m, alt.c.inCheck() ? 'Treppe: Ein Turm gibt Schach, der andere sperrt. Der König muss zurück.' : 'Stelle den Turm so, dass er die nächste Linie sperrt, weit weg vom König.') : h
  }
  return null
}
