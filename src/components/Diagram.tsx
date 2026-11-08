import { t } from '../i18n'
import { Chess, type Color } from 'chess.js'
import { useEffect, useMemo, useRef } from 'react'
import type { Arrow, SquarePair } from './Board'
import { BLACK_COLORS, boardTheme, boardUrl, pieceUrl, settings, WHITE_COLORS } from '../lib/settings'

// A non-interactive position picture: from a FEN or from a move list (English SAN).
// Drawn once into a canvas, so a page with many diagrams scrolls smoothly
// (a live board has 64 squares and up to 32 filtered piece images).

const images = new Map<string, Promise<HTMLImageElement>>()
function loadImage(url: string) {
  let p = images.get(url)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
    images.set(url, p)
  }
  return p
}

const FILES = 'abcdefgh'
const ARROW = { good: 'rgba(60, 170, 75, 0.82)', bad: 'rgba(215, 55, 45, 0.82)', info: 'rgba(60, 130, 230, 0.82)' }

async function draw(canvas: HTMLCanvasElement, fen: string, orientation: Color, last: SquarePair | null, arrows: Arrow[] | undefined) {
  const s = settings.get()
  const theme = boardTheme(s.boardTheme)
  const css = canvas.getBoundingClientRect().width || 300
  const size = Math.round(css * Math.min(window.devicePixelRatio || 1, 2.5))
  const chess = new Chess(fen)
  const pieces = chess.board().flat().filter((p) => p !== null)
  const urls = [...new Set(pieces.map((p) => pieceUrl(p.color, p.type, s.pieceSet)))]
  const [bg, ...imgs] = await Promise.all([loadImage(boardUrl(theme.id)).catch(() => null), ...urls.map((u) => loadImage(u).catch(() => null))])
  const byUrl = new Map(urls.map((u, i) => [u, imgs[i]]))

  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const q = size / 8
  // screen column/row of a square
  const at = (sq: string) => {
    const f = FILES.indexOf(sq[0]), r = Number(sq[1]) - 1
    return orientation === 'w' ? { c: f, r: 7 - r } : { c: 7 - f, r }
  }

  ctx.fillStyle = theme.dark
  ctx.fillRect(0, 0, size, size)
  if (bg) {
    const k = Math.max(size / bg.width, size / bg.height)
    ctx.drawImage(bg, (size - bg.width * k) / 2, (size - bg.height * k) / 2, bg.width * k, bg.height * k)
  } else {
    ctx.fillStyle = theme.light
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 0) ctx.fillRect(c * q, r * q, q, q)
  }
  if (last) {
    ctx.fillStyle = 'rgba(255, 210, 70, 0.42)'
    for (const sq of [last.from, last.to]) { const p = at(sq); ctx.fillRect(p.c * q, p.r * q, q, q) }
  }

  // coordinates like on the live board: ranks on the left column, files on the bottom row
  ctx.font = `700 ${Math.round(q * 0.24)}px system-ui, sans-serif`
  for (let i = 0; i < 8; i++) {
    const rank = orientation === 'w' ? 8 - i : i + 1
    ctx.fillStyle = i % 2 === 0 ? theme.dark : theme.light
    ctx.textBaseline = 'top'; ctx.textAlign = 'left'
    ctx.fillText(String(rank), q * 0.06, i * q + q * 0.04)
    const file = orientation === 'w' ? FILES[i] : FILES[7 - i]
    ctx.fillStyle = i % 2 === 0 ? theme.light : theme.dark
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'right'
    ctx.fillText(file, (i + 1) * q - q * 0.06, size - q * 0.02)
  }

  const w = WHITE_COLORS.find((c) => c.id === s.whiteColor) ?? WHITE_COLORS[0]
  const b = BLACK_COLORS.find((c) => c.id === s.blackColor) ?? BLACK_COLORS[0]
  for (const p of pieces) {
    const img = byUrl.get(pieceUrl(p.color, p.type, s.pieceSet))
    if (!img) continue
    const pos = at(p.square)
    ctx.filter = (p.color === 'w' ? w.filter : b.filter) || 'none'
    ctx.drawImage(img, pos.c * q, pos.r * q, q, q)
  }
  ctx.filter = 'none'

  for (const a of arrows ?? []) {
    const p1 = at(a.from), p2 = at(a.to)
    const x1 = p1.c + 0.5, y1 = p1.r + 0.5, x2 = p2.c + 0.5, y2 = p2.r + 0.5
    const len = Math.hypot(x2 - x1, y2 - y1)
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len
    const head = 0.42
    const sx = x1 + ux * 0.22, sy = y1 + uy * 0.22
    const ex = x2 - ux * head, ey = y2 - uy * head
    const px = -uy * 0.24, py = ux * 0.24
    ctx.strokeStyle = ctx.fillStyle = ARROW[a.color ?? 'good']
    ctx.lineWidth = 0.17 * q
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(sx * q, sy * q); ctx.lineTo(ex * q, ey * q); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo((x2 - ux * 0.08) * q, (y2 - uy * 0.08) * q)
    ctx.lineTo((ex + px) * q, (ey + py) * q)
    ctx.lineTo((ex - px) * q, (ey - py) * q)
    ctx.closePath(); ctx.fill()
  }
}

export default function Diagram({ fen, moves, orientation, arrows, caption, small }: {
  fen?: string
  moves?: string
  orientation: Color
  arrows?: Arrow[]
  caption?: string
  small?: boolean
}) {
  const pos = useMemo(() => {
    if (!moves) return { fen: fen ?? new Chess().fen(), last: null as SquarePair | null }
    const c = new Chess(fen)
    let last: SquarePair | null = null
    for (const m of moves.split(' ').filter(Boolean)) { const mv = c.move(m); last = { from: mv.from, to: mv.to } }
    return { fen: c.fen(), last }
  }, [fen, moves])
  const ref = useRef<HTMLCanvasElement>(null)
  const arrowKey = JSON.stringify(arrows ?? [])
  useEffect(() => {
    if (ref.current) draw(ref.current, pos.fen, orientation, pos.last, arrows).catch(() => { /* picture stays empty */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, orientation, arrowKey])
  return (
    <figure className={'diagram' + (small ? ' small' : '')}>
      <div className="diagram-board"><canvas ref={ref} className="diagram-canvas" role="img" aria-label={caption ?? t('Stellung')} /></div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
