import { useState } from 'react'
import { BOTS, findBot } from '../bots'
import { archive, fensOf, type ArchivedGame } from '../lib/archive'
import { perfEstimate, rating } from '../lib/rating'
import ReviewScreen from './ReviewScreen'
import BotAvatar from '../components/BotAvatar'
import Icon from '../components/Icon'
import { levelInfo, levelTitle, progress } from '../lib/progress'
import { puzzleStats } from '../lib/puzzles'
import { BLACK_COLORS, BOARD_THEMES, DESIGNS, PIECE_SETS, WHITE_COLORS, boardUrl, pieceUrl, settings, type Settings } from '../lib/settings'
import { playSound, preloadSounds, SOUND_SETS } from '../lib/sound'
import './Training.css'

function Toggle({ k, label, sub }: { k: keyof Settings; label: string; sub?: string }) {
  const s = settings.use()
  const on = Boolean(s[k])
  return (
    <div className="setting">
      <span className="setting-label">{label}{sub && <small>{sub}</small>}</span>
      <button className={'switch' + (on ? ' on' : '')} aria-pressed={on} onClick={() => {
        settings.set({ [k]: !on } as Partial<Settings>)
        if (k === 'sound' && !on) setTimeout(() => playSound('move'), 50)
      }} />
    </div>
  )
}

type ProfileTab = 'stats' | 'games' | 'settings'
const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'stats', label: 'Statistik' },
  { id: 'games', label: 'Partien' },
  { id: 'settings', label: 'Einstellungen' },
]

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const W = 300, H = 64
  const min = Math.min(...values) - 20, max = Math.max(...values) + 20
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - ((v - min) / (max - min)) * H).toFixed(1)}`)
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`M0,${H} L${pts.join(' L')} L${W},${H} Z`} className="spark-area" />
      <polyline points={pts.join(' ')} className="spark-line" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="3.5" className="spark-dot" />
    </svg>
  )
}

const OUTCOME = { win: { label: 'Sieg', short: 'S' }, draw: { label: 'Remis', short: 'R' }, loss: { label: 'Niederlage', short: 'N' } }

function GameRow({ g, onOpen }: { g: ArchivedGame; onOpen: () => void }) {
  const bot = findBot(g.botId)
  const date = new Date(g.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  return (
    <button className="game-row" onClick={onOpen}>
      <span className={'outcome ' + g.outcome}>{OUTCOME[g.outcome].short}</span>
      <BotAvatar bot={bot ?? null} size={36} />
      <span className="gr-text">
        <strong>{g.botName} <small>({g.botRating})</small></strong>
        <small>{date} · {g.moves} Züge · {g.color === 'w' ? 'Weiß' : 'Schwarz'}{g.tc ? ` · ${g.tc}` : ''}{g.accuracy != null ? ` · Genauigkeit ${g.accuracy}` : ''}</small>
      </span>
      {g.rated && g.ratingDelta != null
        ? <span className={'gr-delta ' + (g.ratingDelta >= 0 ? 'up' : 'down')}>{g.ratingDelta >= 0 ? '+' : '−'}{Math.abs(g.ratingDelta)}</span>
        : <span className="gr-delta muted">–</span>}
    </button>
  )
}

export default function ProfileScreen({ onPlaying }: { onPlaying: (playing: boolean) => void }) {
  const [tab, setTabState] = useState<ProfileTab>(() => { try { return (localStorage.getItem('profileTab') as ProfileTab) || 'stats' } catch { return 'stats' } })
  const setTab = (t: ProfileTab) => { setTabState(t); try { localStorage.setItem('profileTab', t) } catch { /* ignore */ } }
  const [review, setReview] = useState<ArchivedGame | null>(null)
  const r = rating.use()
  const arch = archive.use()
  const p = progress.use()
  const ps = puzzleStats.use()
  const s = settings.use()
  const { level, into, needed } = levelInfo(p.xp)
  const games = Object.values(p.bots).reduce((a, r) => a + r.played, 0)
  const wins = Object.values(p.bots).reduce((a, r) => a + r.wins, 0)
  const totalStars = Object.values(p.stars).reduce((a, n) => a + n, 0)
  const beaten = BOTS.filter((b) => (p.bots[b.id]?.wins ?? 0) > 0)
  const est = perfEstimate(r)
  const ratedGames = arch.games.filter((g) => g.rated)
  const wdl = { win: 0, draw: 0, loss: 0 }
  for (const g of ratedGames) wdl[g.outcome]++

  if (review) {
    const { moves } = fensOf(review.pgn)
    return (
      <div className="app-overlay">
        <ReviewScreen history={moves} playerColor={review.color} opponent={review.botName} gameId={review.id} pgn={review.pgn}
          onClose={() => { setReview(null); onPlaying(false) }} />
      </div>
    )
  }

  return (
    <div className="profile-screen">
      <h1 className="screen-title">Profil</h1>

      <div className="segmented three" role="tablist">
        {PROFILE_TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'stats' && <>
      <section className="rating-card">
        <div className="rc-top">
          <div>
            <div className="rc-label">Deine Wertung</div>
            <div className="rc-value">{r.rating}{r.games < 10 && <span className="rc-prov" title="vorläufig">?</span>}</div>
            <div className="rc-sub">{r.games === 0 ? 'Spiele eine Partie gegen einen Bot, um eingestuft zu werden.' : r.games < 10 ? `Vorläufig, noch ${10 - r.games} ${10 - r.games === 1 ? 'Partie' : 'Partien'} bis zur festen Wertung.` : `Beste Wertung ${r.peak} · ${r.games} gewertete Partien`}</div>
          </div>
          {ratedGames.length > 0 && (
            <div className="rc-wdl"><span className="w">{wdl.win}</span><span className="d">{wdl.draw}</span><span className="l">{wdl.loss}</span><small>S · R · N</small></div>
          )}
        </div>
        <Sparkline values={[r.start, ...r.history.map((h) => h.r)]} />
        <div className="rc-perf">
          <Icon name="chart" />
          <span>{est
            ? <>Nach der Qualität deiner Züge spielst du etwa wie <strong>{est}</strong> Elo (Schnitt der letzten {Math.min(10, r.perf.length)} Partien).</>
            : <>Nach drei analysierten Partien schätzt die Engine deine Spielstärke auch aus der Qualität deiner Züge.</>}</span>
        </div>
        <p className="rc-note">Gewertet wird jede Partie ohne Tipp und ohne Zurücknehmen. Die Wertung ist eine Schätzung auf Basis der Bot-Stärken, keine offizielle Elo.</p>
      </section>

      <div className="profile-hero" style={{ marginTop: 12 }}>
        <div className="level-badge">{level}<small>LEVEL</small></div>
        <div className="profile-info">
          <div className="profile-title">{levelTitle(level)}</div>
          <div className="xp-bar"><div style={{ width: `${(into / needed) * 100}%` }} /></div>
          <div className="xp-text">{into} / {needed} XP bis Level {level + 1} · gesamt {p.xp} XP</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><strong><Icon name="flame" /> {p.streak}</strong><span>Tage in Folge</span></div>
        <div className="stat"><strong>{wins}/{games}</strong><span>Siege / Partien</span></div>
        <div className="stat"><strong><Icon name="star" fill /> {totalStars}</strong><span>Sterne</span></div>
        <div className="stat"><strong>{ps.rating}</strong><span>Taktik-Wertung</span></div>
        <div className="stat"><strong>{ps.solved}</strong><span>Aufgaben gelöst</span></div>
        <div className="stat"><strong>{ps.peak}</strong><span>Beste Wertung</span></div>
      </div>

      <div className="section-title">Besiegte Bots <span className="section-count">{beaten.length}/{BOTS.length}</span></div>
      <div className="trophy-row">
        {beaten.length === 0 && <p className="empty-note">Noch keiner. Dein erster Sieg landet hier.</p>}
        {beaten.map((b) => (
          <div key={b.id} className="trophy" title={`${b.name} ${b.rating}`}>
            <BotAvatar bot={b} size={52} />
            <span className="cup"><Icon name="crown" fill /></span>
            <small>{b.rating}</small>
          </div>
        ))}
      </div>

      </>}

      {tab === 'games' && (
        <div className="game-list">
          {arch.games.length === 0 && <p className="empty-note">Noch keine Partien. Jede beendete Partie wird hier gespeichert, mit Analyse und PGN zum Kopieren.</p>}
          {arch.games.map((g) => <GameRow key={g.id} g={g} onOpen={() => { setReview(g); onPlaying(true) }} />)}
        </div>
      )}

      {tab === 'settings' && <>
      <div className="section-title">Dein Name</div>
      <div className="settings-list">
        <div className="setting">
          <input className="name-input" id="player-name" value={s.name} maxLength={20} placeholder="Name" onChange={(e) => settings.set({ name: e.target.value })} aria-label="Dein Name" />
        </div>
      </div>

      <div className="section-title">Design</div>
      <div className="design-grid">
        {DESIGNS.map((d) => (
          <button key={d.id} className={'design-card' + (s.design === d.id ? ' active' : '')} onClick={() => settings.set({ design: d.id })}>
            <span className="design-preview" style={{ background: d.swatch[0] }}><i style={{ background: d.swatch[1] }} /></span>
            <strong>{d.name}</strong>
            <small>{d.desc}</small>
          </button>
        ))}
      </div>

      <div className="section-title">Brett</div>
      <div className="board-grid">
        {BOARD_THEMES.map((t) => (
          <button key={t.id} className={'board-choice' + (s.boardTheme === t.id ? ' active' : '')} onClick={() => settings.set({ boardTheme: t.id })}>
            <span className="board-thumb" style={{ backgroundImage: `url(${boardUrl(t.id)})` }} />
            <small>{t.name}</small>
          </button>
        ))}
      </div>

      <div className="section-title">Figuren</div>
      <div className="piece-grid">
        {PIECE_SETS.map((set) => (
          <button key={set.id} className={'piece-choice' + (s.pieceSet === set.id ? ' active' : '')} onClick={() => settings.set({ pieceSet: set.id })}
            style={{ backgroundImage: `url(${boardUrl(s.boardTheme)})` }}>
            <span><img src={pieceUrl('w', 'n', set.id)} alt="" /><img src={pieceUrl('b', 'n', set.id)} alt="" /></span>
            <small>{set.name}</small>
          </button>
        ))}
      </div>
      <div className="settings-list" style={{ marginTop: 10 }}>
        <div className="color-row">
          <span className="color-label">Weiß</span>
          {WHITE_COLORS.map((c) => (
            <button key={c.id} title={c.name} aria-label={c.name} className={'color-dot' + (s.whiteColor === c.id ? ' active' : '')} style={{ background: c.swatch }} onClick={() => settings.set({ whiteColor: c.id })} />
          ))}
          <span className="color-name">{WHITE_COLORS.find((c) => c.id === s.whiteColor)?.name}</span>
        </div>
        <div className="color-row">
          <span className="color-label">Schwarz</span>
          {BLACK_COLORS.map((c) => (
            <button key={c.id} title={c.name} aria-label={c.name} className={'color-dot' + (s.blackColor === c.id ? ' active' : '')} style={{ background: c.swatch }} onClick={() => settings.set({ blackColor: c.id })} />
          ))}
          <span className="color-name">{BLACK_COLORS.find((c) => c.id === s.blackColor)?.name}</span>
        </div>
      </div>

      <div className="section-title">Klang und Spiel</div>
      <div className="settings-list">
        <Toggle k="sound" label="Klang" />
        <div className="chooser">
          {SOUND_SETS.map((set) => (
            <button key={set.id} className={'choice sound-choice' + (s.soundSet === set.id ? ' active' : '')} onClick={() => {
              settings.set({ soundSet: set.id })
              preloadSounds()
              playSound('move', set.id)
              setTimeout(() => playSound('move', set.id), 380)
              setTimeout(() => playSound('capture', set.id), 800)
            }}>
              <Icon name="sound" />
              {set.name}
            </button>
          ))}
        </div>
        <Toggle k="vibration" label="Vibration" sub="Bei Schlagen, Schach und Fehlern" />
        <Toggle k="animation" label="Zug-Animation" />
        <Toggle k="coordinates" label="Koordinaten am Brett" />
        <Toggle k="coach" label="Trainer-Hilfe" sub="Warnt dich in Partien vor groben Fehlern" />
      </div>

      </>}

      {tab === 'settings' && <p className="credits">
        Figuren über das Lichess-Projekt: Staunty, Dubrovny, Cardinal, Fresca, Tatiana (sadsnake1, CC BY-NC-SA 4.0), Cooke (fejfar, CC BY-NC-SA 4.0), Fantasy, Keltisch und Spatial (Maurizio Monge, MIT), Klar (Maxime Chupin, GPLv3+), Rhos (RhosGFX, CC0), Papier (Nikolay Anzarov, CC BY 4.0), Governor (Lichess, AGPLv3+). Bretter: Holzfotos aus dem Lichess-Projekt (AGPLv3+). Porträts: DiceBear „Avataaars“ von Pablo Stanley. Klänge: Kenney (CC0). Taktikaufgaben: Lichess-Puzzle-Datenbank (CC0). Engine: Stockfish 19 (GPLv3).
      </p>}
    </div>
  )
}
