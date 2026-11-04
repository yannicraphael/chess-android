import { settings } from './settings'

// All sounds are synthesised with the Web Audio API, so no audio files are needed.
export type SoundName =
  | 'move' | 'capture' | 'check' | 'castle' | 'promote'
  | 'win' | 'lose' | 'draw' | 'correct' | 'wrong' | 'levelup' | 'tick' | 'warn'

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// A short wooden "tock": filtered noise burst plus a low body resonance.
function knock(c: AudioContext, t: number, gain = 1, pitch = 1) {
  const src = c.createBufferSource()
  src.buffer = noise
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1800 * pitch
  bp.Q.value = 1.2
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.55 * gain, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
  src.connect(bp).connect(g).connect(c.destination)
  src.start(t)
  src.stop(t + 0.08)

  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(240 * pitch, t)
  o.frequency.exponentialRampToValueAtTime(120 * pitch, t + 0.08)
  const og = c.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.exponentialRampToValueAtTime(0.5 * gain, t + 0.003)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
  o.connect(og).connect(c.destination)
  o.start(t)
  o.stop(t + 0.12)
}

function tone(c: AudioContext, t: number, freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.25) {
  const o = c.createOscillator()
  o.type = type
  o.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export function playSound(name: SoundName) {
  const s = settings.get()
  if (s.vibration && 'vibrate' in navigator) {
    const pattern: Partial<Record<SoundName, number | number[]>> = {
      capture: 25, check: [20, 40, 20], wrong: [40, 30, 40], warn: [30, 40, 30], win: [30, 50, 60],
    }
    const p = pattern[name]
    if (p) try { navigator.vibrate(p) } catch { /* ignore */ }
  }
  if (!s.sound) return
  const c = audio()
  if (!c) return
  const t = c.currentTime + 0.005
  switch (name) {
    case 'move': knock(c, t); break
    case 'capture': knock(c, t, 1.2, 0.85); knock(c, t + 0.045, 0.8, 1.1); break
    case 'castle': knock(c, t); knock(c, t + 0.09, 0.8); break
    case 'check': knock(c, t); tone(c, t + 0.02, 880, 0.18, 'triangle', 0.18); break
    case 'promote': knock(c, t); tone(c, t + 0.03, 660, 0.12, 'triangle', 0.15); tone(c, t + 0.12, 990, 0.2, 'triangle', 0.15); break
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.11, f, 0.35, 'triangle', 0.2)); break
    case 'lose': [392, 330, 262].forEach((f, i) => tone(c, t + i * 0.16, f, 0.4, 'sine', 0.22)); break
    case 'draw': tone(c, t, 523, 0.3, 'sine', 0.2); tone(c, t + 0.18, 523, 0.4, 'sine', 0.2); break
    case 'correct': tone(c, t, 784, 0.12, 'triangle', 0.2); tone(c, t + 0.08, 1175, 0.2, 'triangle', 0.2); break
    case 'wrong': tone(c, t, 220, 0.18, 'square', 0.08); tone(c, t + 0.12, 185, 0.25, 'square', 0.08); break
    case 'warn': tone(c, t, 587, 0.15, 'triangle', 0.18); tone(c, t + 0.15, 440, 0.25, 'triangle', 0.18); break
    case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, t + i * 0.08, f, 0.3, 'triangle', 0.18)); break
    case 'tick': tone(c, t, 1400, 0.03, 'square', 0.04); break
  }
}
