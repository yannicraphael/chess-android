// Bundles the calibration harness: the real bot code from src/bots.ts, but with a Node Stockfish.
// Usage (from the repo root): node scripts/calibrate-bots/build.mjs
//   node scripts/calibrate-bots/sim.mjs <ratingA> <ratingB> <games> [refDepth] | python3 scripts/calibrate-bots/rep.py
import { build } from 'rolldown'
import { resolve } from 'node:path'
const dir = resolve('scripts/calibrate-bots')
await build({ input: `${dir}/sim.ts`, platform: 'node', output: { file: `${dir}/sim.mjs`, format: 'esm' },
  transform: { define: { 'import.meta.env.BASE_URL': '"/"' } },
  resolve: { alias: { './engine/stockfish': `${dir}/nodeEngine.ts` } },
  external: ['node:child_process'] })
