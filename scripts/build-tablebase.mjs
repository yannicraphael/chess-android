// Builds tiny endgame tablebases for king + queen and king + rook against a lone king.
// For every position with the lone king to move it stores the number of plies until mate
// with best play from both sides (255 = draw or illegal). Used by the method tips of the
// endgame trainer to check that a suggested move still wins.
// Index: whiteKing * 4096 + piece * 64 + blackKing, square = file + 8 * rank.
import { mkdirSync, writeFileSync } from 'node:fs'

const N = 64 * 64 * 64
const f = (s) => s & 7, r = (s) => s >> 3
const adj = (a, b) => a !== b && Math.abs(f(a) - f(b)) <= 1 && Math.abs(r(a) - r(b)) <= 1
const KING = [...Array(64)].map((_, s) => [...Array(64).keys()].filter((t) => adj(s, t)))
const DIRS = { q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] }

function rays(type, s, block) {
  const out = []
  for (const [df, dr] of DIRS[type]) {
    let x = f(s) + df, y = r(s) + dr
    while (x >= 0 && x < 8 && y >= 0 && y < 8) {
      const t = x + 8 * y
      if (t === block) break
      out.push(t)
      x += df; y += dr
    }
  }
  return out
}

function build(type) {
  const B = new Uint8Array(N).fill(255) // lone king to move
  const W = new Uint8Array(N).fill(255) // attacker to move
  const legal = new Uint8Array(N)
  const bMoves = []; const wMoves = []
  for (let wk = 0; wk < 64; wk++) for (let p = 0; p < 64; p++) for (let bk = 0; bk < 64; bk++) {
    const i = wk * 4096 + p * 64 + bk
    if (wk === p || p === bk || wk === bk || adj(wk, bk)) continue
    legal[i] = 1
    const check = rays(type, p, wk).includes(bk)
    // lone king moves (capturing the piece only if it is not defended)
    const bm = []
    let draw = false
    for (const t of KING[bk]) {
      if (adj(t, wk)) continue
      if (t === p) { if (!adj(wk, p)) draw = true; continue }
      if (rays(type, p, wk).includes(t)) continue
      bm.push(wk * 4096 + p * 64 + t)
    }
    if (draw) bm.push(-1)
    else if (!bm.length) { if (check) B[i] = 0; else bm.push(-1) }
    bMoves[i] = bm
    // attacker moves (only from positions where the lone king is not in check)
    if (!check) {
      const wm = []
      for (const t of KING[wk]) if (t !== p && !adj(t, bk)) wm.push(t * 4096 + p * 64 + bk)
      for (const t of rays(type, p, wk)) if (t !== bk) wm.push(wk * 4096 + t * 64 + bk)
      wMoves[i] = wm
    }
  }
  for (let changed = true; changed;) {
    changed = false
    for (let i = 0; i < N; i++) {
      const wm = wMoves[i]
      if (!wm) continue
      let best = 255
      for (const j of wm) if (B[j] < 255 && B[j] + 1 < best) best = B[j] + 1
      if (best < W[i]) { W[i] = best; changed = true }
    }
    for (let i = 0; i < N; i++) {
      const bm = bMoves[i]
      if (!bm || !bm.length || B[i] === 0) continue
      let worst = 0
      for (const j of bm) { if (j < 0 || W[j] === 255) { worst = 255; break } if (W[j] + 1 > worst) worst = W[j] + 1 }
      if (worst < B[i]) { B[i] = worst; changed = true }
    }
  }
  return B
}

mkdirSync('public/tb', { recursive: true })
for (const t of ['q', 'r']) {
  const B = build(t)
  writeFileSync(`public/tb/k${t}k.bin`, B)
  let max = 0; for (const v of B) if (v < 255 && v > max) max = v
  console.log(`k${t}k: longest mate ${Math.ceil(max / 2)} moves`)
}
