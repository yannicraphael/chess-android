import { t } from '../i18n'
import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { landscapeFonts } from '../components/Scene'
import PuzzlePlayer, { type PuzzleOutcome } from '../games/PuzzlePlayer'
import { useBack } from '../lib/back'
import { REGIONS, STATIONS, STATION_SIZE, currentStation, isPass, journey, regionOf, starsFor, stationPlan, totalStars } from '../lib/journey'
import { LW, REG_H, paintMap, stationPos } from '../lib/landscape'
import { addXp, recordDaily, type XpGain } from '../lib/progress'
import type { Puzzle } from '../lib/puzzles'
import { designOf, settings } from '../lib/settings'
import { playSound } from '../lib/sound'
import { MotifTheoryPage } from './TheoryPage'
import './Training.css'
import './Journey.css'

export const stationName = (i: number) => isPass(i)
  ? t('Pass: {region}', { region: REGIONS[regionOf(i)].name })
  : t('Station {n}', { n: i + 1 })

function css(el: Element, v: string) { return getComputedStyle(el).getPropertyValue(v).trim() }

// Scrollable painted map of all 100 stations
export function JourneyMap({ onClose, onOpen }: { onClose: () => void; onOpen: (station: number) => void }) {
  const j = journey.use()
  const mood = designOf(settings.use().design)
  const cur = currentStation(j)
  const region = REGIONS[regionOf(cur)]
  const canvas = useRef<HTMLCanvasElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const pts = useRef<(readonly [number, number])[]>([])
  const scale = useRef(1)
  const scrolled = useRef(false)
  useBack(() => { onClose() })

  useEffect(() => {
    const cv = canvas.current, sc = scroller.current
    if (!cv || !sc) return
    let alive = true
    const paint = () => {
      if (!alive) return
      const w = Math.min(sc.clientWidth, 640)
      if (!w) return
      const k = w / LW, H = REG_H * REGIONS.length
      scale.current = k
      // canvases have a size limit; keep the backing store below ~16k pixels high
      const dpr = Math.min(window.devicePixelRatio || 1, 2, 16000 / (H * k))
      cv.width = Math.round(w * dpr); cv.height = Math.round(H * k * dpr)
      cv.style.width = w + 'px'; cv.style.height = H * k + 'px'
      const g = cv.getContext('2d')
      if (!g) return
      g.setTransform(dpr * k, 0, 0, dpr * k, 0, 0)
      const root = document.documentElement
      pts.current = paintMap(g, mood, {
        names: REGIONS.map((r) => r.name), n: STATIONS, current: cur, stars: (i) => j.stars[i] ?? 0,
        colors: { accent: css(root, '--accent'), gold: css(root, '--gold'), surface: css(root, '--card'), line: css(root, '--line'), muted: css(root, '--muted'), bg: css(root, '--bg'), onAccent: css(root, '--on-accent') },
        fogText: (r) => [t('Noch im Nebel'), t('Region {n} von {total}', { n: r + 1, total: REGIONS.length })],
      })
      if (!scrolled.current) {
        scrolled.current = true
        sc.scrollTop = stationPos(cur, STATIONS, REGIONS.length)[1] * k - sc.clientHeight * 0.6
      }
    }
    landscapeFonts().then(paint)
    return () => { alive = false }
  }, [mood, cur, j.stars])

  function tap(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect(), k = scale.current
    const x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k
    let best = -1, bd = 26
    pts.current.forEach(([px, py], i) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = i } })
    if (best >= 0 && best <= cur) onOpen(best)
  }

  return (
    <div className="journey-map">
      <header className="jm-head">
        <button className="icon-btn" onClick={onClose} aria-label={t('Zurück')}><Icon name="back" /></button>
        <div className="jm-title">
          <span className="over">{t('Region {n} von {total}', { n: regionOf(cur) + 1, total: REGIONS.length })}</span>
          <strong>{region.name}</strong>
        </div>
        <span className="jm-stars"><Icon name="star" fill />{totalStars(j)}</span>
      </header>
      <div className="jm-scroll" ref={scroller}>
        <canvas ref={canvas} onClick={tap} role="img" aria-label={t('Karte von Schachland mit 100 Stationen')} />
      </div>
      <div className="jm-fab"><button className="btn primary" onClick={() => onOpen(cur)}>{t('{station} starten', { station: stationName(cur) })}</button></div>
    </div>
  )
}

// Plays the six puzzles of one station; an unfinished station is resumed where it was left.
export function JourneyStation({ station, onClose, onMap, onNext }: { station: number; onClose: () => void; onMap: () => void; onNext: (s: number) => void }) {
  const [set, setSet] = useState<Puzzle[] | null>(null)
  const [error, setError] = useState(false)
  const run0 = journey.get().run
  const [results, setResults] = useState<boolean[]>(run0 && run0.station === station ? run0.results : [])
  const [i, setI] = useState(results.length)
  const [answered, setAnswered] = useState(false)
  const [result, setResult] = useState<{ stars: number; solved: number; gain: XpGain; before: number } | null>(null)
  const [theory, setTheory] = useState(false)
  const region = REGIONS[regionOf(station)]
  useBack(() => { if (theory) setTheory(false); else onClose() })

  useEffect(() => {
    stationPlan().then((p) => setSet(p[station])).catch(() => setError(true))
  }, [station])

  function onDone(o: PuzzleOutcome) {
    const r = [...results, o.clean]
    setResults(r)
    setAnswered(true)
    recordDaily('puzzle')
    journey.set({ run: r.length >= STATION_SIZE ? null : { station, ids: set?.map((p) => p.id) ?? [], results: r } })
  }

  function next() {
    if (!set) return
    if (i + 1 < set.length) { setI(i + 1); setAnswered(false); return }
    const solved = results.filter(Boolean).length
    const stars = starsFor(solved)
    const before = journey.get().stars[station] ?? 0
    journey.set((s) => ({ stars: { ...s.stars, [station]: Math.max(before, stars) }, run: null }))
    const gain = addXp(10 + stars * 5 + Math.max(0, stars - before) * 15)
    playSound(stars > 0 ? 'win' : 'draw')
    if (gain.levelUp) setTimeout(() => playSound('levelup'), 700)
    setResult({ stars, solved, gain, before })
  }

  function again() { setResults([]); setI(0); setAnswered(false); setResult(null); journey.set({ run: null }) }

  const nextStation = station + 1 < STATIONS ? station + 1 : null
  return (
    <div className="training-play journey-station">
      <header className="game-header">
        <button className="icon-btn" onClick={onClose} aria-label={t('Zurück')}><Icon name="back" /></button>
        <div className="js-title">
          <strong>{stationName(station)} · {region.name}</strong>
          <span>{t('Aufgabe {n} von {total}', { n: Math.min(i + 1, STATION_SIZE), total: STATION_SIZE })} · {region.motif}</span>
        </div>
        <button className="icon-btn" onClick={onMap} aria-label={t('Karte')}><Icon name="map" /></button>
      </header>
      <div className="js-seg" aria-hidden="true">
        {Array.from({ length: STATION_SIZE }, (_, k) => <i key={k} className={k < results.length ? (results[k] ? 'ok' : 'no') : k === i ? 'now' : ''} />)}
      </div>
      {error && <p className="mg-info">{t('Die Aufgaben konnten nicht geladen werden.')}</p>}
      {!error && !set && <p className="mg-info">{t('Aufgaben werden geladen…')}</p>}
      {set && set[i] && (
        <div className="minigame">
          {region.theory && <button className="theory-link pz-theory" onClick={() => setTheory(true)}><Icon name="book" /> {t('Theorie zum Motiv')}</button>}
          <PuzzlePlayer key={`${station}-${i}`} puzzle={set[i]} onDone={onDone}
            footer={answered ? <div className="puzzle-after"><button className="btn primary big" onClick={next}>{i + 1 >= set.length ? t('Auswertung') : t('Weiter')}</button></div> : null} />
        </div>
      )}
      {theory && region.theory && <MotifTheoryPage theme={region.theory} onClose={() => setTheory(false)} />}
      {result && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className={'result-icon ' + (result.stars > 0 ? 'win' : 'draw')}><Icon name={result.stars === 3 ? 'trophy' : result.stars > 0 ? 'star' : 'refresh'} fill={result.stars > 0 && result.stars < 3} /></div>
            <h2>{result.stars > 0 ? t('{station} geschafft!', { station: stationName(station) }) : t('Fast!')}</h2>
            <div className="stars" style={{ fontSize: 34 }}>{[0, 1, 2].map((k) => <span key={k} className={k < result.stars ? 'on' : ''}><Icon name="star" fill /></span>)}</div>
            <p>{t('{n} von {total} auf Anhieb gelöst', { n: result.solved, total: STATION_SIZE })}</p>
            {result.stars === 0 && <p>{t('Für den Weiterweg brauchst du {n} richtige.', { n: STATION_SIZE - 2 })}</p>}
            <div className="xp-gain"><span className="xp-pill">+{result.gain.amount} XP</span>{result.gain.levelUp && <span className="xp-pill level">{t('Level {n}!', { n: result.gain.newLevel })}</span>}</div>
            <div className="modal-buttons">
              <button className="btn secondary" onClick={again}>{t('Nochmal')}</button>
              {result.stars > 0 && nextStation !== null
                ? <button className="btn primary" onClick={() => onNext(nextStation)}>{t('Weiterwandern')}</button>
                : <button className="btn primary" onClick={onMap}>{t('Zur Karte')}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
