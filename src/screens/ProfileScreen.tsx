import { BOTS } from '../bots'
import { levelInfo, levelTitle, progress } from '../lib/progress'
import { BLACK_COLORS, BOARD_THEMES, PIECE_SETS, WHITE_COLORS, pieceUrl, settings, type Settings } from '../lib/settings'
import { playSound, SOUND_SETS } from '../lib/sound'
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
  const s = settings.use()
  const { level, into, needed } = levelInfo(p.xp)
  const games = Object.values(p.bots).reduce((a, r) => a + r.played, 0)
  const wins = Object.values(p.bots).reduce((a, r) => a + r.wins, 0)
  const totalStars = Object.values(p.stars).reduce((a, n) => a + n, 0)

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
        <div className="stat"><strong>🔥 {p.streak}</strong><span>Tage in Folge</span></div>
        <div className="stat"><strong>{wins}/{games}</strong><span>Siege / Partien</span></div>
        <div className="stat"><strong>⭐ {totalStars}</strong><span>Sterne</span></div>
      </div>

      <div className="section-title">Bot-Trophäen</div>
      <div className="trophies">
        {BOTS.map((b) => {
          const r = p.bots[b.id]
          return (
            <div key={b.id} className={'trophy' + (r?.wins ? '' : ' none')}>
              {r?.wins ? <span className="cup">🏆</span> : null}
              <span className="emoji-avatar" style={{ background: b.color }}>{b.emoji}</span>
              <strong>{b.name}</strong>
              <small>{r ? `${r.wins}-${r.draws}-${r.losses}` : 'noch nicht gespielt'}</small>
            </div>
          )
        })}
      </div>

      <div className="section-title">Einstellungen</div>
      <div className="settings-list">
        <div className="chooser">
          {PIECE_SETS.map((set) => (
            <button key={set.id} className={'choice' + (s.pieceSet === set.id ? ' active' : '')} onClick={() => settings.set({ pieceSet: set.id })}>
              <span className="mini-pieces">
                <img src={pieceUrl('w', 'n', set.id)} alt="" />
                <img src={pieceUrl('b', 'q', set.id)} alt="" />
              </span>
              {set.name}
            </button>
          ))}
        </div>
        <div className="color-row">
          <span className="color-label">Weiß</span>
          {WHITE_COLORS.map((c) => (
            <button key={c.id} title={c.name} aria-label={c.name} className={'color-dot' + (s.whiteColor === c.id ? ' active' : '')} style={{ background: c.swatch }} onClick={() => settings.set({ whiteColor: c.id })} />
          ))}
        </div>
        <div className="color-row">
          <span className="color-label">Schwarz</span>
          {BLACK_COLORS.map((c) => (
            <button key={c.id} title={c.name} aria-label={c.name} className={'color-dot' + (s.blackColor === c.id ? ' active' : '')} style={{ background: c.swatch }} onClick={() => settings.set({ blackColor: c.id })} />
          ))}
        </div>
        <div className="chooser">
          {BOARD_THEMES.map((t) => (
            <button key={t.id} className={'choice' + (s.boardTheme === t.id ? ' active' : '')} onClick={() => settings.set({ boardTheme: t.id })}>
              <span className="mini-board">
                <span style={{ background: t.light, backgroundImage: t.texture?.light }} /><span style={{ background: t.dark, backgroundImage: t.texture?.dark }} />
                <span style={{ background: t.dark, backgroundImage: t.texture?.dark }} /><span style={{ background: t.light, backgroundImage: t.texture?.light }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
        <Toggle k="sound" label="Sound" />
        <div className="chooser">
          {SOUND_SETS.map((set) => (
            <button key={set.id} className={'choice sound-choice' + (s.soundSet === set.id ? ' active' : '')} onClick={() => {
              settings.set({ soundSet: set.id })
              playSound('move', set.id)
              setTimeout(() => playSound('capture', set.id), 450)
            }}>
              <span className="sound-icon">🔊</span>
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
        Figuren über das Lichess-Projekt: Staunty, Dubrovny (sadsnake1, CC BY-NC-SA 4.0), Cooke (fejfar, CC BY-NC-SA 4.0), Fantasy und Keltisch (Maurizio Monge, MIT), Klar (Maxime Chupin, GPLv3+), Rhos (RhosGFX, CC0), Papier (Nikolay Anzarov, CC BY 4.0). Sounds: Kenney (CC0). Engine: Stockfish 19 (GPLv3).
      </p>
    </div>
  )
}
