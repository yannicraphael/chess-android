import { locale, t } from '../i18n'
import { useEffect, useState } from 'react'
import { BOTS, recommendBot, type Bot } from '../bots'
import { archive, dueMistakes } from '../lib/archive'
import { rating } from '../lib/rating'
import { settings } from '../lib/settings'
import Board from '../components/Board'
import BotAvatar from '../components/BotAvatar'
import Icon from '../components/Icon'
import { dailyInfo, weeklyInfo, levelInfo, levelTitle, progress } from '../lib/progress'
import { dailyPuzzle, loadPuzzles, puzzleStats, themeLabels, type Puzzle } from '../lib/puzzles'
import type { Tab } from '../App'
import './HomeScreen.css'

function greeting() {
  const h = new Date().getHours()
  return h < 11 ? t('Guten Morgen') : h < 18 ? t('Hallo') : t('Guten Abend')
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// the puzzle of the day stays the same all day, even when the rating changes
function useDailyPuzzle(rating: number) {
  const [p, setP] = useState<Puzzle | null>(null)
  useEffect(() => {
    loadPuzzles().then((list) => {
      const key = todayKey()
      let id: string | null = null
      try {
        const raw = JSON.parse(localStorage.getItem('dailyPuzzle') ?? 'null')
        if (raw?.date === key) id = raw.id
      } catch { /* ignore */ }
      let pz = id ? list.find((x) => x.id === id) : undefined
      if (!pz) {
        pz = dailyPuzzle(list, key, rating)
        try { localStorage.setItem('dailyPuzzle', JSON.stringify({ date: key, id: pz.id })) } catch { /* ignore */ }
      }
      setP(pz)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return p
}

function Ring({ value, total }: { value: number; total: number }) {
  const r = 24
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" viewBox="0 0 60 60" width="60" height="60" aria-hidden="true">
      <circle cx="30" cy="30" r={r} className="ring-bg" />
      <circle cx="30" cy="30" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - value / total)} />
      <text x="30" y="35" textAnchor="middle">{value}/{total}</text>
    </svg>
  )
}

export default function HomeScreen({ resumeBot, onResume, onDaily, onTab }: {
  resumeBot: Bot | null; onResume: () => void; onDaily: (id: string) => void; onTab: (t: Tab) => void
}) {
  const p = progress.use()
  const ps = puzzleStats.use()
  const d = dailyInfo(p)
  const w = weeklyInfo(p)
  const { level, into, needed } = levelInfo(p.xp)
  const stars = Object.values(p.stars).reduce((a, n) => a + n, 0)
  const puzzle = useDailyPuzzle(ps.rating)
  const solvedToday = (() => { try { return JSON.parse(localStorage.getItem('dailySolved') ?? '""') === todayKey() } catch { return false } })()
  const r = rating.use()
  const st = settings.use()
  const openMistakes = (archive.use(), dueMistakes().length)
  const next = recommendBot(r.rating, p.bots) ?? BOTS[BOTS.length - 1]
  const openLearn = (t: string) => { try { localStorage.setItem('learnTab', t) } catch { /* ignore */ } onTab('learn') }
  const date = new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })
  const left = 3 - d.puzzles
  const goalText = d.done >= d.total ? t('Tagesziel erreicht. Stark!')
    : d.puzzles < 3
      ? (d.games < 1
        ? (left === 1 ? t('Noch 1 Aufgabe und 1 Partie') : t('Noch {n} Aufgaben und 1 Partie', { n: left }))
        : (left === 1 ? t('Noch 1 Aufgabe') : t('Noch {n} Aufgaben', { n: left })))
      : t('Noch 1 Partie bis zum Ziel')

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <div className="home-date">{date}</div>
          <h1 className="home-hello">{greeting()}{st.name ? `, ${st.name}` : ''}</h1>
        </div>
        <div className="home-streak" title={t('Tage in Folge')}><Icon name="flame" />{p.streak}</div>
      </header>

      <section className="card goal">
        <Ring value={d.done} total={d.total} />
        <div className="goal-text">
          <strong>{t('Tagesziel')}</strong>
          <span>{goalText}</span>
        </div>
      </section>

      <section className="card weekly">
        <div className="card-label"><Icon name="calendar" /> {t('Wochenziele')}{w.complete ? ` · ${t('geschafft!')}` : ''}</div>
        {w.goals.map((g) => (
          <div key={g.id} className={'wk-row' + (g.done >= g.total ? ' done' : '')}>
            <span>{g.label}</span>
            <div className="wk-bar"><i style={{ width: `${(g.done / g.total) * 100}%` }} /></div>
            <b>{g.done}/{g.total}</b>
          </div>
        ))}
      </section>

      {resumeBot && (
        <button className="card row-card" onClick={onResume}>
          <BotAvatar bot={resumeBot} size={44} />
          <span className="row-text"><strong>{t('Partie fortsetzen')}</strong><span>{t('gegen {name} ({rating})', { name: resumeBot.name, rating: resumeBot.rating })}</span></span>
          <Icon name="next" />
        </button>
      )}

      <section className="card daily">
        <div className="card-label">{t('Aufgabe des Tages')}</div>
        {puzzle ? (
          <div className="daily-row">
            <div className="daily-board"><Board fen={puzzle.fen} orientation={puzzle.fen.split(' ')[1] === 'w' ? 'b' : 'w'} showCoords={false} /></div>
            <div className="daily-text">
              <strong>{puzzle.fen.split(' ')[1] === 'w' ? t('Schwarz am Zug') : t('Weiß am Zug')}</strong>
              <span>{solvedToday ? `${themeLabels(puzzle)[0] ?? t('Taktik')} · ` : ''}{t('Wertung {n}', { n: puzzle.rating })}</span>
              <button className="btn primary" onClick={() => onDaily(puzzle.id)}>
                {solvedToday ? t('Gelöst ✓ Nochmal') : t('Lösen')}
              </button>
            </div>
          </div>
        ) : <div className="daily-text"><span>{t('Wird geladen…')}</span></div>}
      </section>

      <div className="kpis">
        <button className="kpi" onClick={() => onTab('profile')}><b>{r.rating}{r.games < 10 ? '?' : ''}</b><span>{t('Wertung')}</span></button>
        <button className="kpi" onClick={() => onTab('tactics')}><b>{ps.rating}</b><span>{t('Taktik')}</span></button>
        <button className="kpi" onClick={() => onTab('profile')}><b>{t('Lv {n}', { n: level })}</b><span>{levelTitle(level)} · {stars}<Icon name="star" fill className="kpi-star" /></span><i style={{ width: `${(into / needed) * 100}%` }} /></button>
      </div>

      <button className="card row-card" onClick={() => onTab('play')}>
        <BotAvatar bot={next} size={44} />
        <span className="row-text"><strong>{t('Nächster Gegner: {name}', { name: next.name })}</strong><span>{next.rating} · {next.title}</span></span>
        <Icon name="next" />
      </button>

      <div className="quick">
        <button className="quick-btn" onClick={() => onTab('tactics')}><Icon name="target" /><span>{openMistakes > 0 ? t('Eigene Fehler ({n})', { n: openMistakes }) : t('Taktik-Sprint')}</span></button>
        <button className="quick-btn" onClick={() => openLearn('eroeffnungen')}><Icon name="book" /><span>{t('Eröffnungen')}</span></button>
        <button className="quick-btn" onClick={() => openLearn('endspiele')}><Icon name="crown" /><span>{t('Endspiele')}</span></button>
      </div>
    </div>
  )
}
