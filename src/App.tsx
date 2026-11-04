import type { Color } from 'chess.js'
import { useState } from 'react'
import { BOTS, type Bot } from './bots'
import GameScreen, { type SavedGame } from './screens/GameScreen'
import PlayScreen from './screens/PlayScreen'
import ComingSoon from './screens/ComingSoon'

type Tab = 'play' | 'puzzles' | 'openings' | 'endgames'

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
  { id: 'puzzles', label: 'Taktik', icon: '🧩' },
  { id: 'openings', label: 'Eröffnungen', icon: '📖' },
  { id: 'endgames', label: 'Endspiele', icon: '♔' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('play')
  const [saved, setSaved] = useState<SavedGame | null>(loadSaved)
  const [inGame, setInGame] = useState(false)
  const [gameKey, setGameKey] = useState(0)

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
        {tab === 'puzzles' && (
          <ComingSoon title="Taktik" icon="🧩" items={[
            'Taktikaufgaben nach Schwierigkeit und Motiv (Gabel, Fesselung, Abzug …)',
            'Eigene Taktik-Wertung, die mit dir mitwächst',
            'Tagesaufgabe und Lösungsserien',
          ]} />
        )}
        {tab === 'openings' && (
          <ComingSoon title="Eröffnungen" icon="📖" items={[
            'Eröffnungen Zug für Zug lernen, mit Erklärungen',
            'Varianten wiederholen, bis sie sitzen',
            'Dein eigenes Repertoire für Weiß und Schwarz',
          ]} />
        )}
        {tab === 'endgames' && (
          <ComingSoon title="Endspiele" icon="♔" items={[
            'Grundendspiele: Mattführung mit Dame, Turm, zwei Läufern',
            'Bauernendspiele: Opposition, Quadratregel, Durchbruch',
            'Endspielstellungen gegen die Engine ausspielen',
          ]} />
        )}
      </main>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
