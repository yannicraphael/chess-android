import type { Color } from 'chess.js'
import { useState } from 'react'
import { BOTS, type Bot } from '../bots'
import './PlayScreen.css'

type ColorChoice = 'w' | 'random' | 'b'

export default function PlayScreen({ onStart, resumeBot, onResume }: {
  onStart: (bot: Bot, color: Color) => void
  resumeBot: Bot | null
  onResume: () => void
}) {
  const [botId, setBotId] = useState(() => localStorage.getItem('lastBot') ?? 'lena')
  const [color, setColor] = useState<ColorChoice>('w')
  const bot = BOTS.find((b) => b.id === botId) ?? BOTS[0]

  function start() {
    localStorage.setItem('lastBot', bot.id)
    const c: Color = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color
    onStart(bot, c)
  }

  return (
    <div className="play-screen">
      <h1 className="screen-title">Gegen Bots spielen</h1>

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
          <div className="bot-name">{bot.name} <span className="bot-rating">{bot.rating}</span></div>
          <div className="bot-desc">{bot.description}</div>
        </div>
      </div>

      <div className="bot-grid">
        {BOTS.map((b) => (
          <button key={b.id} className={'bot-tile' + (b.id === bot.id ? ' active' : '')} onClick={() => setBotId(b.id)}>
            <span className="emoji-avatar" style={{ background: b.color }}>{b.emoji}</span>
            <span className="tile-name">{b.name}</span>
            <span className="tile-rating">{b.rating}</span>
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

      <div className="play-footer">
        <button className="btn primary big" onClick={start}>Spielen</button>
      </div>
    </div>
  )
}
