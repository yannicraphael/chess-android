import type { Color } from 'chess.js'
import { useState } from 'react'
import { BOTS, type Bot } from './bots'
import GameScreen, { type SavedGame } from './screens/GameScreen'
import PlayScreen from './screens/PlayScreen'
import TrainingScreen from './screens/TrainingScreen'
import ProfileScreen from './screens/ProfileScreen'

type Tab = 'play' | 'training' | 'profile'

const SAVE_KEY = 'currentGame'

function loadSaved(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as SavedGame) : null
  } catch {
    return null
  }
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'play', label: 'Spielen', icon: '♟' },
  { id: 'training', label: 'Training', icon: '🎯' },
  { id: 'profile', label: 'Profil', icon: '🏅' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('play')
  const [saved, setSaved] = useState<SavedGame | null>(loadSaved)
  const [inGame, setInGame] = useState(false)
  const [gameKey, setGameKey] = useState(0)
  const [miniGame, setMiniGame] = useState(false)

  const savedBot = saved ? BOTS.find((b) => b.id === saved.botId) ?? null : null
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

  return (
    <div className="app">
      <main className="tab-content">
        {tab === 'play' && <PlayScreen onStart={start} resumeBot={resumable} onResume={() => setInGame(true)} />}
        {tab === 'training' && <TrainingScreen onPlaying={setMiniGame} />}
        {tab === 'profile' && <ProfileScreen />}
      </main>
      {!miniGame && <nav className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>}
    </div>
  )
}
