import { t, tk } from './i18n'
import type { Color } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import { groupStoredMistakes, resumeAnalysis } from './lib/archive'
import { settings } from './lib/settings'
import Onboarding from './screens/Onboarding'
import BadgeToast from './components/BadgeToast'
import { listenBackButton } from './lib/back'
import { findBot, type Bot } from './bots'
import Icon, { type IconName } from './components/Icon'
import PuzzleRated from './games/PuzzleRated'
import GameScreen, { type SavedGame } from './screens/GameScreen'
import HomeScreen from './screens/HomeScreen'
import { JourneyMap, JourneyStation } from './screens/JourneyScreen'
import PlayScreen, { type GameMode } from './screens/PlayScreen'
import { Chess } from 'chess.js'
import { addGame } from './lib/archive'
import { recordGame } from './lib/progress'
import { recordRatedGame } from './lib/rating'
import ProfileScreen from './screens/ProfileScreen'
import TrainingScreen from './screens/TrainingScreen'

export type Tab = 'home' | 'play' | 'tactics' | 'learn' | 'profile'

const SAVE_KEY = 'currentGame'

function myMoveCount(g: SavedGame) {
  const c = new Chess()
  try { c.loadPgn(g.pgn) } catch { return 0 }
  return c.history({ verbose: true }).filter((m) => m.color === g.playerColor).length
}

function bookAbandoned(g: SavedGame, bot: Bot) {
  const res = recordRatedGame(bot.rating, 'loss')
  recordGame(bot.id, 'loss')
  const c = new Chess()
  try { c.loadPgn(g.pgn) } catch { /* keep empty */ }
  addGame({
    id: g.id ?? `g${Date.now()}`, date: new Date().toISOString(), botId: bot.id, botName: bot.name, botRating: bot.rating,
    color: g.playerColor, outcome: 'loss', reason: tk('Partie verlassen'), pgn: c.pgn(), moves: Math.ceil(c.history().length / 2),
    rated: true, ratingAfter: res.after, ratingDelta: res.delta, tc: g.tc || undefined,
  })
}

function loadSaved(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as SavedGame) : null
  } catch {
    return null
  }
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: t('Reise'), icon: 'map' },
  { id: 'play', label: t('Spielen'), icon: 'play' },
  { id: 'tactics', label: t('Taktik'), icon: 'puzzle' },
  { id: 'learn', label: t('Lernen'), icon: 'learn' },
  { id: 'profile', label: t('Profil'), icon: 'user' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [saved, setSaved] = useState<SavedGame | null>(loadSaved)
  const [inGame, setInGame] = useState(false)
  const [gameKey, setGameKey] = useState(0)
  const [fullscreen, setFullscreen] = useState(false) // a training game hides the tab bar
  const [daily, setDaily] = useState<string | null>(null)
  const [trip, setTrip] = useState<'map' | number | null>(null) // journey map or a station
  const st = settings.use()
  useEffect(() => { groupStoredMistakes(); resumeAnalysis() }, [])
  // back button on the main tabs: go to the home tab first, then leave the app
  const tabRef = useRef(tab)
  useEffect(() => { tabRef.current = tab }, [tab])
  useEffect(() => listenBackButton(() => {
    if (tabRef.current !== 'home') { setTab('home'); return true }
    return false
  }), [])

  const savedBot = saved ? findBot(saved.botId) : null
  const resumable = saved && savedBot && !saved.result && saved.pgn ? savedBot : null

  function save(g: SavedGame) {
    setSaved(g)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(g)) } catch { /* ignore */ }
  }

  const [pending, setPending] = useState<{ bot: Bot; color: Color; tc: string; mode: GameMode } | null>(null)

  // an unfinished rated game that is left for a new one counts as lost (as on a chess server)
  function abandonable() {
    if (!saved || saved.result || !saved.pgn || !savedBot) return false
    if (saved.mode === 'training' || saved.rated === false) return false
    return myMoveCount(saved) >= 2
  }

  function start(bot: Bot, color: Color, tc: string, mode: GameMode, confirmed = false) {
    if (abandonable() && !confirmed) { setPending({ bot, color, tc, mode }); return }
    if (abandonable() && saved && savedBot) bookAbandoned(saved, savedBot)
    setPending(null)
    save({ botId: bot.id, playerColor: color, pgn: '', result: null, id: `g${Date.now()}`, tc, rated: mode === 'rated', mode })
    setGameKey((k) => k + 1)
    setInGame(true)
  }

  if (!st.onboarded) {
    return <div className="app"><Onboarding onDone={() => setTab('home')} /></div>
  }

  if (inGame && saved && savedBot) {
    return (
      <div className="app">
        <GameScreen key={gameKey} bot={savedBot} saved={saved} onSave={save} onExit={() => setInGame(false)} onAbort={() => {
          setSaved(null)
          try { localStorage.removeItem(SAVE_KEY) } catch { /* ignore */ }
          setInGame(false)
        }} />
        <BadgeToast />
      </div>
    )
  }

  if (trip !== null) {
    return (
      <div className="app">
        {trip === 'map'
          ? <JourneyMap onClose={() => setTrip(null)} onOpen={setTrip} />
          : <JourneyStation key={trip} station={trip} onClose={() => setTrip(null)} onMap={() => setTrip('map')} onNext={setTrip} />}
        <BadgeToast />
      </div>
    )
  }

  if (daily) {
    return <div className="app"><PuzzleRated firstId={daily} onExit={() => setDaily(null)} /><BadgeToast /></div>
  }

  return (
    <div className="app">
      <BadgeToast />
      <main className="tab-content" key={tab}>
        <div className="screen-enter">
          {tab === 'home' && <HomeScreen resumeBot={resumable} onResume={() => setInGame(true)} onDaily={setDaily} onTab={setTab} onJourney={setTrip} />}
          {tab === 'play' && <PlayScreen onStart={start} resumeBot={resumable} onResume={() => setInGame(true)} />}
          {tab === 'tactics' && <TrainingScreen section="tactics" onPlaying={setFullscreen} />}
          {tab === 'learn' && <TrainingScreen section="learn" onPlaying={setFullscreen} />}
          {tab === 'profile' && <ProfileScreen onPlaying={setFullscreen} />}
        </div>
      </main>
      {pending && resumable && (
        <div className="modal-backdrop" onClick={() => setPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('Laufende Partie aufgeben?')}</h2>
            <p>{t('Deine gewertete Partie gegen {name} ist noch nicht beendet. Startest du eine neue, zählt sie als verloren.', { name: resumable.name })}</p>
            <div className="modal-buttons">
              <button className="btn secondary" onClick={() => { setPending(null); setInGame(true) }}>{t('Fortsetzen')}</button>
              <button className="btn primary" onClick={() => start(pending.bot, pending.color, pending.tc, pending.mode, true)}>{t('Neue Partie')}</button>
            </div>
          </div>
        </div>
      )}
      {!fullscreen && <nav className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            <span className="tab-icon"><Icon name={t.icon} /></span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>}
    </div>
  )
}
