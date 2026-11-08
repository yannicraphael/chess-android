// Painted paper-cut landscapes of Schachland, drawn procedurally on a canvas.
// One region is REG_H tall and LW wide in logical units; callers scale it to their size.
// The mood (Sommer/Herbst/Nacht) recolours everything.
import type { DesignId } from './settings'

export type Mood = DesignId
export const LW = 282
export const REG_H = 760

type Deco = 'village' | 'forest' | 'river' | 'coast' | 'ridge' | 'canyon' | 'highland' | 'mountain' | 'glacier' | 'summit'
export interface RegionArt { sky: [string, string]; hills: [string, string, string]; deco: Deco; fig: string }

export const REGION_ART: RegionArt[] = [
  { sky: ['#bfe3f7', '#eaf6fd'], hills: ['#acd690', '#8cc373', '#6ead5a'], deco: 'village', fig: '♜' },
  { sky: ['#c3e2d8', '#e8f4ee'], hills: ['#79b172', '#57945a', '#3c7b46'], deco: 'forest', fig: '♞' },
  { sky: ['#c4e2f4', '#eef7fd'], hills: ['#a4cf8e', '#82ba70', '#63a35b'], deco: 'river', fig: '♝' },
  { sky: ['#acd9f1', '#e8f5fd'], hills: ['#efdca9', '#e2c78a', '#cfae6c'], deco: 'coast', fig: '♝' },
  { sky: ['#cbd6ee', '#eef1fb'], hills: ['#a2b8a3', '#819c87', '#62816c'], deco: 'ridge', fig: '♜' },
  { sky: ['#f7d6ba', '#fdeee2'], hills: ['#df9c70', '#c97d54', '#ae6442'], deco: 'canyon', fig: '♞' },
  { sky: ['#ddd3ec', '#f4effa'], hills: ['#b9c98f', '#99b073', '#7c955a'], deco: 'highland', fig: '♛' },
  { sky: ['#c6cfe6', '#ebeffa'], hills: ['#939db8', '#7682a2', '#5c6787'], deco: 'mountain', fig: '♜' },
  { sky: ['#d6ebf7', '#f5fbfe'], hills: ['#d8ebf4', '#b8dbea', '#97c6dd'], deco: 'glacier', fig: '♝' },
  { sky: ['#f6d08a', '#fcecd0'], hills: ['#e6e2ef', '#cec8e0', '#b3abcc'], deco: 'summit', fig: '♚' },
]

const FIG_FONT = "'Figurines', 'Noto Sans Symbols 2', 'Segoe UI Symbol', serif"
const TITLE_FONT = "'Fraunces Variable', Georgia, serif"

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60
  }
  return [h, s, l]
}
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const hsl = (h: number, s: number, l: number) => `hsl(${((h % 360) + 360) % 360} ${clamp(s) * 100}% ${clamp(l) * 100}%)`
function lighten(hex: string, d: number) { const [h, s, l] = hexToHsl(hex); return hsl(h, s, l + d) }

class Painter {
  g: CanvasRenderingContext2D
  mood: Mood
  constructor(g: CanvasRenderingContext2D, mood: Mood) { this.g = g; this.mood = mood }

  // recolours a summer colour for the current mood
  c(hex: string) {
    if (this.mood === 'sommer' || hex[0] !== '#') return hex
    let [h, s, l] = hexToHsl(hex)
    if (this.mood === 'herbst') {
      if (h >= 50 && h <= 175 && s > 0.15) { h = 22 + ((h - 50) / 125) * 26; s = Math.min(0.75, s * 1.05 + 0.08); l *= 0.96 }
      return hsl(h, s, l)
    }
    s *= 0.32; l = l * 0.36 + 0.05
    return hsl(h, s, l)
  }
  sky(a: RegionArt): [string, string] { return this.mood === 'nacht' ? ['#0f1630', '#2a3762'] : this.mood === 'herbst' ? ['#f4c896', '#fbe9d4'] : a.sky }
  soft(on: boolean) {
    const g = this.g
    g.shadowColor = on ? (this.mood === 'nacht' ? 'rgba(0,0,0,0.35)' : 'rgba(40,30,20,0.16)') : 'transparent'
    g.shadowBlur = on ? 8 : 0; g.shadowOffsetY = on ? 2 : 0
  }
  ridge(y0: number, amp: number, col: string, seed: number) {
    const g = this.g, r = rnd(seed), ph = r() * 6, f1 = 0.012 + r() * 0.01, f2 = 0.031 + r() * 0.02
    const grad = g.createLinearGradient(0, y0 - amp * 1.4, 0, y0 + 160)
    grad.addColorStop(0, this.c(col)); grad.addColorStop(1, this.c(darker(col)))
    g.fillStyle = grad; this.soft(true); g.beginPath(); g.moveTo(0, y0 + 400)
    for (let x = 0; x <= LW; x += 6) g.lineTo(x, y0 - Math.sin(x * f1 + ph) * amp - Math.sin(x * f2 + ph * 2) * amp * 0.35)
    g.lineTo(LW, y0 + 400); g.closePath(); g.fill(); this.soft(false)
  }
  tree(x: number, y: number, s: number, col: string, kind: 'pine' | 'round') {
    const g = this.g
    this.soft(true)
    g.fillStyle = this.c('#7a5233'); g.fillRect(x - s * 0.07, y - s * 0.2, s * 0.14, s * 0.35)
    g.fillStyle = this.c(col)
    if (kind === 'pine') {
      for (let k = 0; k < 3; k++) {
        g.beginPath(); g.moveTo(x, y - s * (1.1 - k * 0.22) - s * 0.2)
        g.lineTo(x - s * (0.3 + k * 0.1), y - s * (0.45 - k * 0.2) - s * 0.2); g.lineTo(x + s * (0.3 + k * 0.1), y - s * (0.45 - k * 0.2) - s * 0.2); g.fill()
      }
    } else {
      g.beginPath(); g.ellipse(x, y - s * 0.55, s * 0.34, s * 0.42, 0, 0, 7); g.fill()
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(x - s * 0.1, y - s * 0.68, s * 0.14, s * 0.2, -0.4, 0, 7); g.fill()
    }
    this.soft(false)
  }
  house(x: number, y: number, s: number, wall: string, roof: string) {
    const g = this.g
    this.soft(true); g.fillStyle = this.c(wall); g.fillRect(x - s / 2, y - s * 0.7, s, s * 0.7)
    g.fillStyle = this.c(roof); g.beginPath(); g.moveTo(x - s * 0.6, y - s * 0.68); g.lineTo(x, y - s * 1.12); g.lineTo(x + s * 0.6, y - s * 0.68); g.fill(); this.soft(false)
    const night = this.mood === 'nacht'
    g.fillStyle = night ? '#ffd36b' : this.c('#f3dca0')
    if (night) { g.shadowColor = '#ffcc55'; g.shadowBlur = 10 }
    g.fillRect(x - s * 0.15, y - s * 0.46, s * 0.18, s * 0.18); g.shadowBlur = 0; g.shadowColor = 'transparent'
  }
  figure(ch: string, x: number, y: number, size: number, col: string) {
    const g = this.g
    g.font = `${size}px ${FIG_FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'
    this.soft(true); g.shadowBlur = 14; g.shadowOffsetY = 6; g.fillStyle = this.c(col); g.fillText(ch, x, y); this.soft(false)
    g.globalAlpha = 0.14; g.fillStyle = '#fff'; g.fillText(ch, x - size * 0.03, y - size * 0.02); g.globalAlpha = 1
  }
  decorate(a: RegionArt, oy: number, r: () => number, k: number, name: string) {
    const g = this.g, y = (v: number) => oy + v, d = a.deco
    if (d === 'village' || d === 'river' || d === 'highland') for (let i = 0; i < 9; i++) this.tree(r() * LW, y(260 + r() * 460), 22 + r() * 16, ['#5b9e4e', '#4b8f47', '#73b25d'][i % 3], 'round')
    if (d === 'village') { this.house(48, y(600), 34, '#f6e3c8', '#b9553f'); this.house(88, y(612), 28, '#fbeedc', '#55739a'); this.house(230, y(420), 30, '#f6e3c8', '#c8803f') }
    if (d === 'forest' || d === 'ridge' || d === 'mountain') for (let i = 0; i < 26; i++) this.tree(r() * LW, y(140 + r() * 600), 22 + r() * 22, ['#336d3e', '#3f7f49', '#285d34'][i % 3], 'pine')
    if (d === 'river') {
      g.strokeStyle = this.c('#62a8d6'); g.lineWidth = 24; g.lineCap = 'round'; g.beginPath(); g.moveTo(-20, y(520)); g.bezierCurveTo(90, y(440), 180, y(620), LW + 20, y(500)); g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.5; g.setLineDash([10, 12]); g.stroke(); g.setLineDash([])
      this.house(214, y(470), 32, '#f2e0c3', '#7d5536')
    }
    if (d === 'coast') {
      g.fillStyle = this.c('#5cb0d4'); g.beginPath(); g.moveTo(LW, y(120)); g.bezierCurveTo(150, y(260), 230, y(520), LW, y(740)); g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5
      for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(232 + (i % 2) * 20, y(250 + i * 80), 6, Math.PI, 0); g.stroke() }
    }
    if (d === 'canyon') {
      g.fillStyle = this.c('#9a5233')
      for (let i = 0; i < 5; i++) { const x = r() * LW; g.beginPath(); g.moveTo(x - 30, y(740)); g.lineTo(x - 18, y(400 + r() * 200)); g.lineTo(x + 18, y(380 + r() * 200)); g.lineTo(x + 30, y(740)); g.fill() }
    }
    if (d === 'mountain' || d === 'glacier' || d === 'summit') for (let i = 0; i < 4; i++) {
      const x = 30 + i * 75 + r() * 20, top = y(140 + r() * 120)
      this.soft(true); g.fillStyle = this.c(d === 'glacier' ? '#a8d0e4' : '#727c99'); g.beginPath(); g.moveTo(x - 70, y(520)); g.lineTo(x, top); g.lineTo(x + 70, y(520)); g.fill(); this.soft(false)
      g.fillStyle = this.c('#ffffff'); g.beginPath(); g.moveTo(x - 22, top + 44); g.lineTo(x, top); g.lineTo(x + 22, top + 44); g.lineTo(x + 8, top + 36); g.lineTo(x, top + 46); g.lineTo(x - 9, top + 34); g.fill()
    }
    this.figure(a.fig, k % 2 ? 214 : 66, y(360), d === 'summit' ? 116 : 90, d === 'canyon' ? '#5a2c18' : d === 'summit' ? '#d9a12c' : '#3a3648')
    if (name) {
      const sx = k % 2 ? 56 : 210, sy = y(700)
      this.soft(true); g.fillStyle = this.c('#7d5536'); g.fillRect(sx - 2.5, sy - 44, 5, 48)
      g.fillStyle = this.c('#f3e6cc'); g.beginPath(); g.roundRect(sx - 64, sy - 62, 128, 26, 6); g.fill(); this.soft(false)
      g.fillStyle = this.c('#3a2a1c'); g.textAlign = 'center'
      let fs = 14
      do { g.font = `600 ${fs}px ${TITLE_FONT}`; fs -= 0.5 } while (fs > 8 && g.measureText(name).width > 116)
      g.fillText(name, sx, sy - 44)
    }
  }
  region(k: number, oy: number, name = '') {
    const g = this.g, a = REGION_ART[k], r = rnd(k * 131 + 7), sc = this.sky(a)
    const sky = g.createLinearGradient(0, oy, 0, oy + REG_H * 0.6); sky.addColorStop(0, sc[0]); sky.addColorStop(1, sc[1])
    g.fillStyle = sky; g.fillRect(0, oy, LW, REG_H)
    if (this.mood === 'nacht') {
      const rs = rnd(k * 97 + 3); g.fillStyle = '#fff'
      for (let i = 0; i < 40; i++) { g.globalAlpha = 0.3 + rs() * 0.7; g.beginPath(); g.arc(rs() * LW, oy + rs() * 340, rs() * 1.2 + 0.3, 0, 7); g.fill() }
      g.globalAlpha = 1; g.fillStyle = '#f4ead0'; g.shadowColor = 'rgba(255,240,200,0.6)'; g.shadowBlur = 24
      g.beginPath(); g.arc(226, oy + 196, 20, 0, 7); g.fill(); g.shadowBlur = 0; g.shadowColor = 'transparent'
      g.fillStyle = sc[0]; g.beginPath(); g.arc(234, oy + 190, 17, 0, 7); g.fill()
    } else if (k === 0 || k === 2 || k === 9 || this.mood === 'herbst') {
      const sy = this.mood === 'herbst' ? 236 : 196, col = this.mood === 'herbst' ? '#f2a24e' : '#ffd66b'
      g.fillStyle = col; g.globalAlpha = 0.3; g.beginPath(); g.arc(220, oy + sy, 44, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(220, oy + sy, 28, 0, 7); g.fill()
    }
    this.ridge(oy + 180, 26, a.hills[0], k * 11 + 1)
    this.ridge(oy + 330, 34, a.hills[1], k * 11 + 2)
    this.decorate(a, oy, r, k, name)
    this.ridge(oy + 560, 22, a.hills[2], k * 11 + 3)
    const dark = a.deco === 'forest' || a.deco === 'mountain' || a.deco === 'ridge'
    for (let i = 0; i < 7; i++) this.tree(r() * LW, oy + 640 + r() * 110, 18 + r() * 12, dark ? '#336d3e' : '#4b8f47', dark ? 'pine' : 'round')
    if (this.mood !== 'nacht') for (let i = 0; i < 14; i++) { g.fillStyle = this.c(['#ffffff', '#f2cf5b', '#ef9aa8', '#d2e3f7'][i % 4]); g.beginPath(); g.arc(r() * LW, oy + 600 + r() * 150, 2, 0, 7); g.fill() }
  }
  pawn(x: number, y: number, size: number) {
    const g = this.g
    g.font = `${size}px ${FIG_FONT}`; g.textAlign = 'center'; this.soft(true); g.fillStyle = this.mood === 'nacht' ? '#f1ece0' : '#24232c'; g.fillText('♟', x, y); this.soft(false)
    const s = size / 38
    g.fillStyle = '#c8413e'; g.fillRect(x - 9 * s, y - 16 * s, 18 * s, 4 * s); g.fillRect(x + 5 * s, y - 16 * s, 4 * s, 10 * s)
  }
}

function darker(hex: string) { return hexToHsl(hex)[2] > 0.07 ? toHex(lighten(hex, -0.07)) : hex }
function toHex(c: string) {
  const m = /hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/.exec(c)
  if (!m) return c
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const t = (x: number) => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p }
  const hx = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return '#' + hx(t(h + 1 / 3)) + hx(t(h)) + hx(t(h - 1 / 3))
}

export function rnd(seed: number) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647 }

// A region cut-out filling a canvas of the given size (cover-scaled from the top at offset oy).
export function paintScene(g: CanvasRenderingContext2D, w: number, h: number, region: number, oy: number, mood: Mood, opts: { pawn?: boolean } = {}) {
  const p = new Painter(g, mood)
  const sc = Math.max(w / LW, h / 420)
  g.save(); g.translate((w - LW * sc) / 2, 0); g.scale(sc, sc); p.region(region, oy); g.restore()
  if (opts.pawn) p.pawn(w - 46, h - 40, 46)
}

export interface MapColors { accent: string; gold: string; surface: string; line: string; muted: string; bg: string; onAccent: string }

// Position of station i (0-based) on the journey map, counted from the bottom.
export function stationPos(i: number, n: number, regions: number) {
  const H = REG_H * regions
  const y = H - 70 - i * ((H - 140) / (n - 1))
  const x = LW / 2 + Math.sin(i * 0.52) * 88 + Math.sin(i * 0.17) * 18
  return [x, y] as const
}

// The whole journey map: regions bottom to top, road, stations, player pawn and fog over unknown regions.
export function paintMap(g: CanvasRenderingContext2D, mood: Mood, o: {
  names: string[]; n: number; current: number; stars: (i: number) => number; colors: MapColors; fogText: (region: number) => [string, string]
}) {
  const p = new Painter(g, mood), R = o.names.length, H = REG_H * R, col = o.colors
  for (let k = 0; k < R; k++) p.region(R - 1 - k, k * REG_H, o.names[R - 1 - k])
  g.lineCap = 'round'; g.lineJoin = 'round'
  const pts = Array.from({ length: o.n }, (_, i) => stationPos(i, o.n, R))
  const road = (w: number, c: string, from: number, to: number) => {
    g.strokeStyle = c; g.lineWidth = w; g.beginPath()
    pts.slice(from, to).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
  }
  p.soft(true); road(14, p.c('#efe2c4'), 0, o.n); p.soft(false)
  road(5, col.accent, 0, o.current + 1)
  g.setLineDash([1, 9]); road(3, p.c('#c9ab7a'), o.current, o.n); g.setLineDash([])
  pts.forEach(([x, y], i) => {
    const pass = (i + 1) % 10 === 0, done = i < o.current, now = i === o.current, rad = pass ? 16 : now ? 15 : 12
    p.soft(true); g.fillStyle = now ? col.gold : done ? col.accent : col.surface; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); p.soft(false)
    if (!done && !now) { g.strokeStyle = col.line; g.lineWidth = 2; g.stroke() }
    if (now) { g.strokeStyle = col.surface; g.lineWidth = 3; g.stroke() }
    g.fillStyle = done ? col.onAccent : now ? (mood === 'nacht' ? '#1b1608' : '#fff') : col.muted
    g.font = `800 ${pass ? 13 : 11.5}px 'Nunito Sans Variable', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(String(i + 1), x, y + 0.5); g.textBaseline = 'alphabetic'
    if (done) {
      const n = o.stars(i)
      for (let s = 0; s < 3; s++) { g.fillStyle = s < n ? col.gold : 'rgba(0,0,0,0.18)'; g.beginPath(); g.arc(x - 8 + s * 8, y + rad + 6, 2.6, 0, 7); g.fill() }
    }
    if (pass) {
      g.fillStyle = p.c('#6a4a30'); g.fillRect(x + 13, y - 36, 2.5, 26)
      g.fillStyle = col.accent; g.beginPath(); g.moveTo(x + 15.5, y - 36); g.lineTo(x + 34, y - 31); g.lineTo(x + 15.5, y - 25); g.fill()
    }
  })
  const [px, py] = pts[Math.min(o.current, o.n - 1)]
  p.pawn(px, py - 18, 34)
  // fog over the regions after the current one
  const curRegion = Math.floor(o.current / 10)
  if (curRegion < R - 1) {
    const top = H - (curRegion + 1) * REG_H // upper edge of the current region
    const rgb = /^#[0-9a-f]{6}$/i.test(col.bg) ? [1, 3, 5].map((i) => parseInt(col.bg.slice(i, i + 2), 16)).join(',') : '246,242,234'
    const fog = g.createLinearGradient(0, top - 340, 0, top + 60)
    fog.addColorStop(0, `rgba(${rgb},0.95)`); fog.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = fog; g.fillRect(0, top - 340, LW, 400)
    g.fillStyle = `rgba(${rgb},0.95)`; g.fillRect(0, 0, LW, top - 340)
    g.fillStyle = col.muted; g.textAlign = 'center'
    for (let k = curRegion + 1; k < R; k++) {
      const fy = H - k * REG_H - REG_H / 2 - (k === curRegion + 1 ? 60 : 0)
      const [a, b] = o.fogText(k)
      g.font = `600 15px ${TITLE_FONT}`; g.fillText(a, LW / 2, fy)
      g.font = "700 11px 'Nunito Sans Variable', sans-serif"; g.fillText(b, LW / 2, fy + 18)
    }
  }
  return pts
}
