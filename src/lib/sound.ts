import { settings } from './settings'

// Real recorded sounds (Kenney, CC0) from public/sounds, played via Web Audio
// for low latency. Piece sounds come in several sets the player can choose.
export type SoundName =
  | 'move' | 'capture' | 'check' | 'castle' | 'promote'
  | 'win' | 'lose' | 'draw' | 'correct' | 'wrong' | 'levelup' | 'tick' | 'warn' | 'start'

export const SOUND_SETS = [
  { id: 'clack', name: 'Klack' },
  { id: 'wood', name: 'Holz' },
  { id: 'deep', name: 'Holz tief' },
] as const

const UI_FILES = ['start', 'win', 'lose', 'draw', 'correct', 'wrong', 'levelup', 'warn', 'tick', 'check', 'promote']
const BASE = `${import.meta.env.BASE_URL}sounds/`

let ctx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<AudioBuffer | null>>()

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function load(path: string): Promise<AudioBuffer | null> {
  const c = audio()
  if (!c) return Promise.resolve(null)
  let p = loading.get(path)
  if (!p) {
    p = fetch(BASE + path)
      .then((r) => r.arrayBuffer())
      .then((data) => c.decodeAudioData(data))
      .then((buf) => { buffers.set(path, buf); return buf })
      .catch(() => null)
    loading.set(path, p)
  }
  return p
}

// Loads all sounds of the current set in the background
export function preloadSounds() {
  const set = settings.get().soundSet
  for (const f of ['move', 'capture']) void load(`${set}/${f}.mp3`)
  for (const f of UI_FILES) void load(`ui/${f}.mp3`)
}

function play(path: string, delay = 0, gain = 1) {
  const c = audio()
  if (!c) return
  const start = (buf: AudioBuffer) => {
    const src = c.createBufferSource()
    src.buffer = buf
    const g = c.createGain()
    g.gain.value = gain
    src.connect(g).connect(c.destination)
    src.start(c.currentTime + delay)
  }
  const buf = buffers.get(path)
  if (buf) start(buf)
  else void load(path).then((b) => b && start(b))
}

export function playSound(name: SoundName, setOverride?: string) {
  const s = settings.get()
  if (s.vibration && 'vibrate' in navigator && !setOverride) {
    const pattern: Partial<Record<SoundName, number | number[]>> = {
      capture: 20, check: [15, 40, 15], wrong: [40, 30, 40], warn: [30, 40, 30], win: [30, 50, 60],
    }
    const p = pattern[name]
    if (p) try { navigator.vibrate(p) } catch { /* ignore */ }
  }
  if (!s.sound) return
  const set = setOverride ?? s.soundSet
  switch (name) {
    case 'move': play(`${set}/move.mp3`); break
    case 'capture': play(`${set}/capture.mp3`); break
    case 'castle': play(`${set}/move.mp3`); play(`${set}/move.mp3`, 0.12, 0.8); break
    case 'check': play(`${set}/move.mp3`); play('ui/check.mp3', 0.04); break
    case 'promote': play(`${set}/move.mp3`); play('ui/promote.mp3', 0.05); break
    default: play(`ui/${name}.mp3`)
  }
}
