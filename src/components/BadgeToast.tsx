import { useEffect, useRef, useState } from 'react'
import { archive } from '../lib/archive'
import { checkBadges, type Badge } from '../lib/badges'
import { progress } from '../lib/progress'
import { puzzleStats } from '../lib/puzzles'
import { rating } from '../lib/rating'
import { playSound } from '../lib/sound'
import Icon from './Icon'
import './BadgeToast.css'

// Watches the stores and shows a short notice when a new badge is earned.
export default function BadgeToast() {
  const [shown, setShown] = useState<Badge[] | null>(null)
  const timer = useRef(0)
  useEffect(() => {
    let pending = 0
    const run = () => {
      clearTimeout(pending)
      pending = window.setTimeout(() => {
        const fresh = checkBadges()
        if (!fresh.length) return
        setShown(fresh)
        playSound('levelup')
        clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setShown(null), 4200)
      }, 600)
    }
    run()
    const offs = [progress.subscribe(run), rating.subscribe(run), puzzleStats.subscribe(run), archive.subscribe(run)]
    return () => { offs.forEach((o) => o()); clearTimeout(pending); clearTimeout(timer.current) }
  }, [])
  if (!shown) return null
  const b = shown[0]
  return (
    <button className="badge-toast" onClick={() => setShown(null)} role="status">
      <span className="bt-icon"><Icon name="medal" /></span>
      <span className="bt-text">
        <small>{shown.length > 1 ? `${shown.length} neue Abzeichen` : 'Neues Abzeichen'}</small>
        <strong>{shown.length > 1 ? shown.map((x) => x.name).join(', ') : b.name}</strong>
        {shown.length === 1 && <span>{b.text}</span>}
      </span>
    </button>
  )
}
