import type { Color } from 'chess.js'
import { useState } from 'react'
import { BOTS, type Bot } from '../bots'
import { levelInfo, progress } from '../lib/progress'
import { settings } from '../lib/settings'
import './PlayScreen.css'

type ColorChoice = 'w' | 'random' | 'b'

export default function PlayScreen({ onStart, resumeBot, onResume }: {
  onStart: (bot: Bot, color: Color) => void
  resumeBot: Bot | null
  onResume: () => void
}) {
  const p = progress.use()
  const st = settings.use()
  // recommend the weakest bot that has not been beaten yet
  const recommended = BOTS.find((b) => !(p.bots[b.id]?.wins > 0))?.id
  const [botId, setBotId] = useState(() => localStorage.getItem('lastBot') ?? recommended ?? 'kiki')
  const { level, into, needed } = levelInfo(p.xp)
  const [color, setColor] = useState<ColorChoice>('w')
  const bot = BOTS.find((b) => b.id === botId) ?? BOTS[0]

  function start() {
    localStorage.setItem('lastBot', bot.id)
    const c: Color = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color
    onStart(bot, c)
  }

  return (
    <div className="play-screen">
      <div className="play-top">
        <h1 className="screen-title">Gegen Bots spielen</h1>
        <div className="level-chip">
          {p.streak > 0 && <span className="streak">🔥{p.streak}</span>}
          <span className="lvl">Lv {level}</span>
          <span className="mini-xp"><span style={{ width: `${(into / needed) * 100}%` }} /></span>
        </div>
      </div>

      {resumeBot && (
        <button className="resume-card" onClick={onResume}>
          <span className="emoji-avatar small" style={{ background: resumeBot.color }}>{resumeBot.emoji}</span>
          <span className="resume-text">
            <strong>Partie fortsetzen</strong>
            <span>gegen {resumeBot.name} ({resumeBot.rating})</span>
          </span>
          <span className="chev">›</span>
        </button>
      )}

      <div className="bot-hero">
        <span className="emoji-avatar big" style={{ background: bot.color }}>{bot.emoji}</span>
        <div>
          <div className="bot-name">{bot.name} <span className="bot-rating">{bot.rating}</span>{p.bots[bot.id]?.wins ? <span className="beaten">🏆 besiegt</span> : null}</div>
          <div className="bot-desc">{bot.description}</div>
        </div>
      </div>

      <div className="bot-grid">
        {BOTS.map((b) => (
          <button key={b.id} className={'bot-tile' + (b.id === bot.id ? ' active' : '')} onClick={() => setBotId(b.id)}>
            <span className="emoji-avatar" style={{ background: b.color }}>{b.emoji}</span>
            <span className="tile-name">{b.name}</span>
            <span className="tile-rating">{b.rating}</span>
            {p.bots[b.id]?.wins ? <span className="tile-badge">🏆</span> : b.id === recommended ? <span className="tile-badge rec">Tipp</span> : null}
          </button>
        ))}
      </div>

      <div className="section-label">Ich spiele</div>
      <div className="color-picker">
        {(['w', 'random', 'b'] as ColorChoice[]).map((c) => (
          <button key={c} className={'color-opt' + (color === c ? ' active' : '')} onClick={() => setColor(c)}>
            <span className={'color-swatch ' + c} />
            {c === 'w' ? 'Weiß' : c === 'b' ? 'Schwarz' : 'Zufall'}
          </button>
        ))}
      </div>

      <button className="coach-toggle" onClick={() => settings.set({ coach: !st.coach })}>
        <span>🎓</span>
        <span className="ct-text"><strong>Trainer-Hilfe</strong><small>Warnt dich vor groben Fehlern und schlägt Besseres vor</small></span>
        <span className={'switch' + (st.coach ? ' on' : '')} />
      </button>

      <div className="play-footer">
        <button className="btn primary big" onClick={start}>Spielen</button>
      </div>
    </div>
  )
}
