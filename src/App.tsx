import type { Color } from 'chess.js'
import { useState } from 'react'
import { findBot, type Bot } from './bots'
import Icon, { type IconName } from './components/Icon'
import PuzzleRated from './games/PuzzleRated'
import GameScreen, { type SavedGame } from './screens/GameScreen'
import HomeScreen from './screens/HomeScreen'
import PlayScreen from './screens/PlayScreen'
import ProfileScreen from './screens/ProfileScreen'
import TrainingScreen from './screens/TrainingScreen'

export type Tab = 'home' | 'play' | 'tactics' | 'learn' | 'profile'

const SAVE_KEY = 'currentGame'

function loadSaved(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as SavedGame) : null
  } catch {
    return null
  }
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Heute', icon: 'home' },
  { id: 'play', label: 'Spielen', icon: 'play' },
  { id: 'tactics', label: 'Taktik', icon: 'puzzle' },
  { id: 'learn', label: 'Lernen', icon: 'learn' },
  { id: 'profile', label: 'Profil', icon: 'user' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [saved, setSaved] = useState<SavedGame | null>(loadSaved)
  const [inGame, setInGame] = useState(false)
  const [gameKey, setGameKey] = useState(0)
  const [fullscreen, setFullscreen] = useState(false) // a training game hides the tab bar
  const [daily, setDaily] = useState<string | null>(null)

  const savedBot = saved ? findBot(saved.botId) : null
  const resumable = saved && savedBot && !saved.result && saved.pgn ? savedBot : null

  function save(g: SavedGame) {
    setSaved(g)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(g)) } catch { /* ignore */ }
  }

  function start(bot: Bot, color: Color) {
    save({ botId: bot.id, playerColor: color, pgn: '', result: null })
    setGameKey((k) => k + 1)
    setInGame(true)
  }

  if (inGame && saved && savedBot) {
    return (
      <div className="app">
        <GameScreen key={gameKey} bot={savedBot} saved={saved} onSave={save} onExit={() => setInGame(false)} />
      </div>
    )
  }

  if (daily) {
    return <div className="app"><PuzzleRated firstId={daily} onExit={() => setDaily(null)} /></div>
  }

  return (
    <div className="app">
      <main className="tab-content" key={tab}>
        <div className="screen-enter">
          {tab === 'home' && <HomeScreen resumeBot={resumable} onResume={() => setInGame(true)} onDaily={setDaily} onTab={setTab} />}
          {tab === 'play' && <PlayScreen onStart={start} resumeBot={resumable} onResume={() => setInGame(true)} />}
          {tab === 'tactics' && <TrainingScreen section="tactics" onPlaying={setFullscreen} />}
          {tab === 'learn' && <TrainingScreen section="learn" onPlaying={setFullscreen} />}
          {tab === 'profile' && <ProfileScreen />}
        </div>
      </main>
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
