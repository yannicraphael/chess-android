import { BOTS } from '../bots'
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

export default function ProfileScreen() {
  const p = progress.use()
  const ps = puzzleStats.use()
  const s = settings.use()
  const { level, into, needed } = levelInfo(p.xp)
  const games = Object.values(p.bots).reduce((a, r) => a + r.played, 0)
  const wins = Object.values(p.bots).reduce((a, r) => a + r.wins, 0)
  const totalStars = Object.values(p.stars).reduce((a, n) => a + n, 0)
  const beaten = BOTS.filter((b) => (p.bots[b.id]?.wins ?? 0) > 0)

  return (
    <div className="profile-screen">
      <h1 className="screen-title">Profil</h1>

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

      <p className="credits">
        Figuren über das Lichess-Projekt: Staunty, Dubrovny, Cardinal, Fresca, Tatiana (sadsnake1, CC BY-NC-SA 4.0), Cooke (fejfar, CC BY-NC-SA 4.0), Fantasy, Keltisch und Spatial (Maurizio Monge, MIT), Klar (Maxime Chupin, GPLv3+), Rhos (RhosGFX, CC0), Papier (Nikolay Anzarov, CC BY 4.0), Governor (Lichess, AGPLv3+). Bretter: Holzfotos aus dem Lichess-Projekt (AGPLv3+). Porträts: DiceBear „Avataaars“ von Pablo Stanley. Klänge: Kenney (CC0). Taktikaufgaben: Lichess-Puzzle-Datenbank (CC0). Engine: Stockfish 19 (GPLv3).
      </p>
    </div>
  )
}
