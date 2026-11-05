// Builds public/puzzles.json from Lichess puzzle CSV files (Lichess puzzle database, CC0).
// Usage: node scripts/build-puzzles.mjs file1.csv file2.csv ...
import { readFileSync, writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const head = lines.shift().split(',')
  return lines.map((l) => {
    const cols = []
    let cur = '', q = false
    for (const ch of l) {
      if (ch === '"') q = !q
      else if (ch === ',' && !q) { cols.push(cur); cur = '' }
      else cur += ch
    }
    cols.push(cur)
    return Object.fromEntries(head.map((h, i) => [h, cols[i]]))
  })
}

const seen = new Map()
for (const f of process.argv.slice(2)) {
  for (const r of parseCsv(readFileSync(f, 'utf8'))) {
    if (!r.PuzzleId || !r.FEN || !r.Moves || seen.has(r.PuzzleId)) continue
    const moves = r.Moves.trim().split(' ')
    // validate: every move must be legal
    try {
      const c = new Chess(r.FEN)
      for (const m of moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
    } catch { continue }
    if (moves.length < 2 || moves.length % 2 !== 0) continue
    seen.set(r.PuzzleId, { id: r.PuzzleId, fen: r.FEN, moves: r.Moves.trim(), rating: Number(r.Rating), themes: (r.Themes || '').trim() })
  }
}
const list = [...seen.values()].sort((a, b) => a.rating - b.rating)
writeFileSync('public/puzzles.json', JSON.stringify(list))
console.log(`${list.length} puzzles written`)
