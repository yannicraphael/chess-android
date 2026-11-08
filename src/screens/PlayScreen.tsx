import { t } from '../i18n'
import type { Color } from 'chess.js'
import { useState } from 'react'
import { BOT_GROUPS, BOTS, ENGINE_MAX, ENGINE_MIN, engineBot, findBot, flag, recommendBot, type Bot } from '../bots'
import BotAvatar from '../components/BotAvatar'
import Icon from '../components/Icon'
import { progress } from '../lib/progress'
import { rating } from '../lib/rating'
import { settings } from '../lib/settings'
import { TIME_CONTROLS } from '../lib/timeControl'
import './PlayScreen.css'

type ColorChoice = 'w' | 'random' | 'b'

export type GameMode = 'rated' | 'training'

export default function PlayScreen({ onStart, resumeBot, onResume }: {
  onStart: (bot: Bot, color: Color, tc: string, mode: GameMode) => void
  resumeBot: Bot | null
  onResume: () => void
}) {
  const p = progress.use()
  const st = settings.use()
  const r = rating.use()
  const recommended = recommendBot(r.rating, p.bots)?.id
  const [botId, setBotId] = useState(() => localStorage.getItem('lastBot') ?? recommended ?? 'gerda')
  const [engineRating, setEngineRating] = useState(() => Number(localStorage.getItem('engineRating')) || 1500)
  const [color, setColor] = useState<ColorChoice>('w')
  const [tc, setTcState] = useState(() => localStorage.getItem('timeControl') ?? '')
  const [mode, setModeState] = useState<GameMode>(() => (localStorage.getItem('gameMode') as GameMode) || 'rated')
  const setMode = (v: GameMode) => { setModeState(v); try { localStorage.setItem('gameMode', v) } catch { /* ignore */ } }
  const setTc = (v: string) => { setTcState(v); try { localStorage.setItem('timeControl', v) } catch { /* ignore */ } }
  const bot = botId.startsWith('engine-') ? engineBot(engineRating) : findBot(botId) ?? BOTS[0]
  const beaten = (id: string) => (p.bots[id]?.wins ?? 0) > 0

  function start() {
    localStorage.setItem('lastBot', bot.id)
    const c: Color = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color
    onStart(bot, c, tc, mode)
  }

  function setEngine(r: number) {
    setEngineRating(r)
    setBotId(`engine-${r}`)
    try { localStorage.setItem('engineRating', String(r)) } catch { /* ignore */ }
  }

  const bubble = bot.greet ?? (bot.group === 'top' ? bot.title + '.' : bot.bio)

  return (
    <div className="play-screen">
      <div className="play-title-row">
        <h1 className="screen-title">{t('Spielen')}</h1>
        <span className="my-rating" title={t('Deine Wertung aus Partien gegen die Bots')}><Icon name="trophy" /> {r.rating}{r.games < 10 ? '?' : ''}</span>
      </div>

      {resumeBot && (
        <button className="resume-card" onClick={onResume}>
          <BotAvatar bot={resumeBot} size={40} />
          <span className="resume-text"><strong>{t('Partie fortsetzen')}</strong><span>{t('gegen {name} ({rating})', { name: resumeBot.name, rating: resumeBot.rating })}</span></span>
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
        {beaten(bot.id) && <span className="beaten"><Icon name="crown" fill /> {t('besiegt')}</span>}
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
                  {beaten(b.id) ? <span className="tile-crown"><Icon name="crown" fill /></span> : b.id === recommended ? <span className="tile-rec">{t('Tipp')}</span> : null}
                  <span className="tile-rating">{b.rating}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <section className="bot-group">
        <div className="group-head"><span>{t('Engine')}</span></div>
        <button className={'engine-card' + (bot.group === 'engine' ? ' active' : '')} onClick={() => setEngine(engineRating)}>
          <BotAvatar bot={engineBot(engineRating)} size={48} />
          <div className="engine-body">
            <div className="engine-top"><strong>Stockfish</strong><span>{engineRating}</span></div>
            <input type="range" id="engine-rating" min={ENGINE_MIN} max={ENGINE_MAX} step={50} value={engineRating}
              onChange={(e) => setEngine(Number(e.target.value))} onClick={(e) => e.stopPropagation()} aria-label={t('Engine-Stärke')} />
            <div className="engine-scale"><span>{ENGINE_MIN}</span><span>{ENGINE_MAX}</span></div>
          </div>
        </button>
      </section>

      <div className="tc-row" id="play-options">
        <span className="tc-label"><Icon name="clock" /> {t('Bedenkzeit')}</span>
        <div className="tc-chips">
          {TIME_CONTROLS.map((x) => (
            <button key={x.id} className={'tc-chip' + (tc === x.id ? ' active' : '')} onClick={() => setTc(x.id)}>{x.label}</button>
          ))}
        </div>
      </div>

      <div className="mode-row" role="radiogroup" aria-label={t('Art der Partie')}>
        <button className={'mode-opt' + (mode === 'rated' ? ' active' : '')} role="radio" aria-checked={mode === 'rated'} onClick={() => setMode('rated')}>
          <Icon name="trophy" />
          <strong>{t('Gewertet')}</strong>
          <small>{t('Ohne Hilfen, zählt für deine Wertung')}</small>
        </button>
        <button className={'mode-opt' + (mode === 'training' ? ' active' : '')} role="radio" aria-checked={mode === 'training'} onClick={() => setMode('training')}>
          <Icon name="learn" />
          <strong>{t('Training')}</strong>
          <small>{t('Tipps und Zurücknehmen, ohne Wertung')}</small>
        </button>
      </div>

      {mode === 'training' && (
        <button className="coach-toggle" onClick={() => settings.set({ coach: !st.coach })}>
          <Icon name="learn" />
          <span className="ct-text"><strong>{t('Trainer-Hilfe')}</strong><small>{t('Warnt vor groben Fehlern und schlägt Besseres vor')}</small></span>
          <span className={'switch' + (st.coach ? ' on' : '')} />
        </button>
      )}

      <div className="play-footer">
        <button className="play-summary" onClick={() => document.getElementById('play-options')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Icon name={mode === 'rated' ? 'trophy' : 'learn'} />
          <span>{mode === 'rated' ? t('Gewertet') : t('Training')} · {TIME_CONTROLS.find((x) => x.id === tc)?.label ?? t('Ohne Uhr')}</span>
          <small>{t('ändern')}</small>
        </button>
        <div className="color-picker">
          {(['w', 'random', 'b'] as ColorChoice[]).map((c) => (
            <button key={c} className={'color-opt' + (color === c ? ' active' : '')} onClick={() => setColor(c)} aria-label={c === 'w' ? t('Weiß') : c === 'b' ? t('Schwarz') : t('Zufall')}>
              <span className={'color-swatch ' + c} />
            </button>
          ))}
        </div>
        <button className="btn primary big" onClick={start}>{t('Spielen')}</button>
      </div>
    </div>
  )
}
