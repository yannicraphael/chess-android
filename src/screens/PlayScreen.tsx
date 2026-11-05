import type { Color } from 'chess.js'
import { useState } from 'react'
import { BOT_GROUPS, BOTS, ENGINE_MAX, ENGINE_MIN, engineBot, findBot, flag, type Bot } from '../bots'
import BotAvatar from '../components/BotAvatar'
import Icon from '../components/Icon'
import { progress } from '../lib/progress'
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
  const [botId, setBotId] = useState(() => localStorage.getItem('lastBot') ?? recommended ?? 'gerda')
  const [engineRating, setEngineRating] = useState(() => Number(localStorage.getItem('engineRating')) || 1500)
  const [color, setColor] = useState<ColorChoice>('w')
  const bot = botId.startsWith('engine-') ? engineBot(engineRating) : findBot(botId) ?? BOTS[0]
  const beaten = (id: string) => (p.bots[id]?.wins ?? 0) > 0

  function start() {
    localStorage.setItem('lastBot', bot.id)
    const c: Color = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color
    onStart(bot, c)
  }

  function setEngine(r: number) {
    setEngineRating(r)
    setBotId(`engine-${r}`)
    try { localStorage.setItem('engineRating', String(r)) } catch { /* ignore */ }
  }

  const bubble = bot.greet ?? (bot.group === 'top' ? bot.title + '.' : bot.bio)

  return (
    <div className="play-screen">
      <h1 className="screen-title">Spielen</h1>

      {resumeBot && (
        <button className="resume-card" onClick={onResume}>
          <BotAvatar bot={resumeBot} size={40} />
          <span className="resume-text"><strong>Partie fortsetzen</strong><span>gegen {resumeBot.name} ({resumeBot.rating})</span></span>
          <Icon name="next" />
        </button>
      )}

      <div className="bot-hero" key={bot.id}>
        <BotAvatar bot={bot} size={88} className="hero-av" />
        <div className="hero-bubble">{bubble}</div>
      </div>
      <div className="hero-name">
        <span className="bot-name">{bot.name}</span>
        <span className="bot-rating">{bot.rating}</span>
        {bot.cc && <span className="bot-flag">{flag(bot.cc)}</span>}
        {beaten(bot.id) && <span className="beaten"><Icon name="crown" fill /> besiegt</span>}
      </div>
      <div className="bot-title">{bot.title}</div>

      {BOT_GROUPS.map((g) => {
        const list = BOTS.filter((b) => b.group === g.id)
        const won = list.filter((b) => beaten(b.id)).length
        return (
          <section key={g.id} className="bot-group">
            <div className="group-head"><span>{g.name}</span><small>{won ? `${won}/` : ''}{list.length}</small></div>
            <div className="bot-grid">
              {list.map((b) => (
                <button key={b.id} className={'bot-tile' + (b.id === bot.id ? ' active' : '')} onClick={() => setBotId(b.id)} aria-label={`${b.name} ${b.rating}`}>
                  <BotAvatar bot={b} size={56} />
                  {beaten(b.id) ? <span className="tile-crown"><Icon name="crown" fill /></span> : b.id === recommended ? <span className="tile-rec">Tipp</span> : null}
                  <span className="tile-rating">{b.rating}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <section className="bot-group">
        <div className="group-head"><span>Engine</span></div>
        <button className={'engine-card' + (bot.group === 'engine' ? ' active' : '')} onClick={() => setEngine(engineRating)}>
          <BotAvatar bot={engineBot(engineRating)} size={48} />
          <div className="engine-body">
            <div className="engine-top"><strong>Stockfish</strong><span>{engineRating}</span></div>
            <input type="range" id="engine-rating" min={ENGINE_MIN} max={ENGINE_MAX} step={50} value={engineRating}
              onChange={(e) => setEngine(Number(e.target.value))} onClick={(e) => e.stopPropagation()} aria-label="Engine-Stärke" />
            <div className="engine-scale"><span>{ENGINE_MIN}</span><span>{ENGINE_MAX}</span></div>
          </div>
        </button>
      </section>

      <button className="coach-toggle" onClick={() => settings.set({ coach: !st.coach })}>
        <Icon name="learn" />
        <span className="ct-text"><strong>Trainer-Hilfe</strong><small>Warnt vor groben Fehlern und schlägt Besseres vor</small></span>
        <span className={'switch' + (st.coach ? ' on' : '')} />
      </button>

      <div className="play-footer">
        <div className="color-picker">
          {(['w', 'random', 'b'] as ColorChoice[]).map((c) => (
            <button key={c} className={'color-opt' + (color === c ? ' active' : '')} onClick={() => setColor(c)} aria-label={c === 'w' ? 'Weiß' : c === 'b' ? 'Schwarz' : 'Zufall'}>
              <span className={'color-swatch ' + c} />
            </button>
          ))}
        </div>
        <button className="btn primary big" onClick={start}>Spielen</button>
      </div>
    </div>
  )
}
