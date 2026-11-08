import { useEffect, useRef } from 'react'
import { paintScene } from '../lib/landscape'
import { designOf, settings } from '../lib/settings'
import './Scene.css'

let fontsReady: Promise<unknown> | null = null
export function landscapeFonts() {
  if (!fontsReady) {
    fontsReady = document.fonts
      ? Promise.race([
          Promise.all([document.fonts.load("40px 'Figurines'", '♟♞'), document.fonts.load("600 14px 'Fraunces Variable'"), document.fonts.load("800 12px 'Nunito Sans Variable'")]),
          new Promise((r) => setTimeout(r, 1500)),
        ]).catch(() => {})
      : Promise.resolve()
  }
  return fontsReady
}

// A painted landscape (one Schachland region) filling its box. Repaints on resize and mood change.
export default function Scene({ region, offset = -200, pawn = false, className = '', children }: {
  region: number; offset?: number; pawn?: boolean; className?: string; children?: React.ReactNode
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const mood = designOf(settings.use().design)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let alive = true
    const paint = () => {
      if (!alive) return
      const r = cv.getBoundingClientRect()
      if (!r.width || !r.height) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr)
      const g = cv.getContext('2d')
      if (!g) return
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintScene(g, r.width, r.height, region, offset, mood, { pawn })
    }
    landscapeFonts().then(paint)
    let w = 0
    const ro = new ResizeObserver((e) => { const nw = Math.round(e[0].contentRect.width); if (nw !== w) { w = nw; paint() } })
    ro.observe(cv)
    return () => { alive = false; ro.disconnect() }
  }, [region, offset, pawn, mood])
  return (
    <div className={'scene ' + className}>
      <canvas ref={ref} aria-hidden="true" />
      {children}
    </div>
  )
}
