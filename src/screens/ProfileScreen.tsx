import { BOTS } from '../bots'
import { levelInfo, levelTitle, progress } from '../lib/progress'
import { BOARD_THEMES, PIECE_SETS, pieceUrl, settings, type Settings } from '../lib/settings'
import { playSound } from '../lib/sound'
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
        <div className="chooser">
          {BOARD_THEMES.map((t) => (
            <button key={t.id} className={'choice' + (s.boardTheme === t.id ? ' active' : '')} onClick={() => settings.set({ boardTheme: t.id })}>
              <span className="mini-board">
                <span style={{ background: t.light }} /><span style={{ background: t.dark }} />
                <span style={{ background: t.dark }} /><span style={{ background: t.light }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
        <Toggle k="sound" label="Sound" />
        <Toggle k="vibration" label="Vibration" sub="Bei Schlagen, Schach und Fehlern" />
        <Toggle k="animation" label="Zug-Animation" />
        <Toggle k="coordinates" label="Koordinaten am Brett" />
        <Toggle k="coach" label="Trainer-Hilfe" sub="Warnt dich in Partien vor groben Fehlern" />
      </div>

      <p className="credits">
        Figuren: Maestro, Kardinal und Fresca von sadsnake1 (CC BY-NC-SA 4.0), Merida von Armando H. Marroquin (GPLv2+), Klassisch von Colin M.L. Burnett (GPLv2+), über das Lichess-Projekt. Engine: Stockfish 19 (GPLv3).
      </p>
    </div>
  )
}
