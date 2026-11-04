import { settings } from './settings'

// All sounds are synthesised with the Web Audio API (no audio files).
// Piece sounds use modal synthesis: a tiny noise "impact" excites a few
// resonances of a wooden piece and board, which sounds much more like a real
// piece being set down than a plain beep.
export type SoundName =
  | 'move' | 'capture' | 'check' | 'castle' | 'promote'
  | 'win' | 'lose' | 'draw' | 'correct' | 'wrong' | 'levelup' | 'tick' | 'warn' | 'start'

let ctx: AudioContext | null = null
let out: AudioNode | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1

    // master chain: gentle low-pass, a small room reverb and a limiter
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -10
    comp.ratio.value = 6
    comp.connect(ctx.destination)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 7000
    lp.connect(comp)
    const verb = ctx.createConvolver()
    const len = Math.floor(ctx.sampleRate * 0.22)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    }
    verb.buffer = ir
    const wet = ctx.createGain()
    wet.gain.value = 0.12
    verb.connect(wet).connect(lp)
    const bus = ctx.createGain()
    bus.connect(lp)
    bus.connect(verb)
    out = bus
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface HitOptions { gain?: number; pitch?: number; bright?: number; body?: number }

// One wooden impact: piece touching the board.
function hit(c: AudioContext, t: number, { gain = 1, pitch = 1, bright = 1, body = 1 }: HitOptions = {}) {
  // exciter: a few milliseconds of noise
  const ex = c.createBufferSource()
  ex.buffer = noise
  ex.playbackRate.value = 0.9 + Math.random() * 0.2
  const exEnv = c.createGain()
  exEnv.gain.setValueAtTime(1, t)
  exEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.004)
  ex.connect(exEnv)
  ex.start(t, Math.random() * 0.3)
  ex.stop(t + 0.01)

  // resonant modes of the piece (frequency ratio, decay seconds, level)
  const base = 640 * pitch * (0.97 + Math.random() * 0.06)
  const modes: [number, number, number][] = [
    [1, 0.05, 1], [2.43, 0.032, 0.55 * bright], [4.1, 0.02, 0.35 * bright], [6.7, 0.012, 0.22 * bright],
  ]
  for (const [ratio, decay, level] of modes) {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = base * ratio
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.38 * level * gain), t + 0.0015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay * 4)
    o.connect(g).connect(out!)
    o.start(t)
    o.stop(t + decay * 4 + 0.02)
  }

  // contact click
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2500
  const cg = c.createGain()
  cg.gain.value = 0.25 * gain * bright
  exEnv.connect(hp).connect(cg).connect(out!)

  // low "thump" of the board
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(170 * pitch, t)
  o.frequency.exponentialRampToValueAtTime(95 * pitch, t + 0.06)
  const og = c.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.45 * gain * body), t + 0.003)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
  o.connect(og).connect(out!)
  o.start(t)
  o.stop(t + 0.1)
}

// Soft mallet tone (marimba-like) for notifications
function mallet(c: AudioContext, t: number, freq: number, dur = 0.5, gain = 0.22) {
  for (const [mult, lvl, d] of [[1, 1, dur], [4, 0.25, dur * 0.25], [10, 0.06, dur * 0.1]] as const) {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq * mult
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain * lvl, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(g).connect(out!)
    o.start(t)
    o.stop(t + d + 0.02)
  }
}

function buzz(c: AudioContext, t: number, freq: number, dur: number, gain = 0.16) {
  const o = c.createOscillator()
  o.type = 'square'
  o.frequency.value = freq
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1200
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(lp).connect(g).connect(out!)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export function playSound(name: SoundName) {
  const s = settings.get()
  if (s.vibration && 'vibrate' in navigator) {
    const pattern: Partial<Record<SoundName, number | number[]>> = {
      capture: 20, check: [15, 40, 15], wrong: [40, 30, 40], warn: [30, 40, 30], win: [30, 50, 60],
    }
    const p = pattern[name]
    if (p) try { navigator.vibrate(p) } catch { /* ignore */ }
  }
  if (!s.sound) return
  const c = audio()
  if (!c || !out) return
  const t = c.currentTime + 0.01
  switch (name) {
    case 'move': hit(c, t); break
    // capture: the taking piece knocks the other one, then lands - sharper and brighter
    case 'capture': hit(c, t, { gain: 0.7, pitch: 1.35, bright: 1.6, body: 0.4 }); hit(c, t + 0.035, { gain: 1.1, pitch: 0.95, bright: 1.2 }); break
    case 'castle': hit(c, t, { pitch: 1.05 }); hit(c, t + 0.13, { gain: 0.9, pitch: 0.92 }); break
    case 'check': hit(c, t, { gain: 1.1, bright: 1.4 }); mallet(c, t + 0.03, 1318, 0.25, 0.1); break
    case 'promote': hit(c, t); mallet(c, t + 0.05, 784, 0.3, 0.14); mallet(c, t + 0.14, 1175, 0.4, 0.14); break
    case 'start': mallet(c, t, 587, 0.5); mallet(c, t + 0.12, 880, 0.6); break
    case 'win': [523, 659, 784, 1047].forEach((f, i) => mallet(c, t + i * 0.1, f, 0.7)); break
    case 'lose': mallet(c, t, 440, 0.6); mallet(c, t + 0.18, 349, 0.9); break
    case 'draw': mallet(c, t, 587, 0.5); mallet(c, t + 0.16, 587, 0.7); break
    case 'correct': mallet(c, t, 880, 0.3, 0.18); mallet(c, t + 0.07, 1319, 0.4, 0.18); break
    case 'wrong': buzz(c, t, 196, 0.16); buzz(c, t + 0.1, 165, 0.22); break
    case 'warn': mallet(c, t, 698, 0.3, 0.2); mallet(c, t + 0.14, 523, 0.45, 0.2); break
    case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => mallet(c, t + i * 0.07, f, 0.6, 0.16)); break
    case 'tick': hit(c, t, { gain: 0.5, pitch: 2, body: 0 }); break
  }
}
