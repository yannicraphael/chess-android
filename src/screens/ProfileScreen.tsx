import { LANGS, lang, locale, t } from '../i18n'
import Scene from '../components/Scene'
import { useRef, useState } from 'react'
import { BOTS, findBot } from '../bots'
import { archive, fensOf, type ArchivedGame } from '../lib/archive'
import { perfEstimate, rating } from '../lib/rating'
import ReviewScreen from './ReviewScreen'
import BotAvatar from '../components/BotAvatar'
import Icon, { type IconName } from '../components/Icon'
import { BADGES } from '../lib/badges'
import { levelInfo, levelTitle, progress } from '../lib/progress'
import { puzzleStats } from '../lib/puzzles'
import { BLACK_COLORS, BOARD_THEMES, DESIGNS, PIECE_SETS, designOf, WHITE_COLORS, boardUrl, pieceUrl, settings, switchLanguage, switchNotation, type Settings } from '../lib/settings'
import { playSound, preloadSounds, SOUND_SETS } from '../lib/sound'
import { makeBackup, restoreBackup, shareOrDownload } from '../lib/backup'
import './Training.css'

// notation example with the piece letters of the app language
const letterSample = { de: 'Sf3 Dxd8', en: 'Nf3 Qxd8', es: 'Cf3 Dxd8' }[lang]

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

function BackupSection() {
  const [msg, setMsg] = useState('')
  const [paste, setPaste] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  async function save() {
    let r: string
    try { r = await shareOrDownload(makeBackup()) } catch { setMsg(t('Speichern abgebrochen. Du kannst die Sicherung auch kopieren.')); return }
    setMsg(r === 'shared' ? t('Sicherung geteilt. Speichere sie zum Beispiel in deinen Dateien oder in der Cloud.') : t('Sicherung als Datei gespeichert (Ordner „Downloads“).'))
  }
  async function copy() {
    try { await navigator.clipboard.writeText(makeBackup()); setMsg(t('Sicherung in die Zwischenablage kopiert.')) } catch { setMsg(t('Kopieren hat nicht geklappt.')) }
  }
  function restore(text: string) {
    if (!window.confirm(t('Alle jetzigen Daten auf diesem Gerät werden durch die Sicherung ersetzt. Fortfahren?'))) return
    const err = restoreBackup(text)
    if (err) setMsg(err)
  }
  return (
    <>
      <div className="section-title">{t('Daten sichern')}</div>
      <div className="settings-list backup">
        <p className="backup-note">{t('Fortschritt, Wertung, Partien und Einstellungen liegen nur auf diesem Gerät. Mit einer Sicherung nimmst du alles auf ein neues Handy mit.')}</p>
        <div className="backup-buttons">
          <button className="btn secondary small" onClick={save}><Icon name="download" /> {t('Sicherung speichern')}</button>
          <button className="btn secondary small" onClick={copy}><Icon name="copy" /> {t('Kopieren')}</button>
          <button className="btn secondary small" onClick={() => fileRef.current?.click()}><Icon name="refresh" /> {t('Aus Datei laden')}</button>
          <button className="btn secondary small" onClick={() => setPaste('')}><Icon name="book" /> {t('Einfügen')}</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json,text/plain" hidden onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) restore(await f.text())
        }} />
        {paste !== null && (
          <div className="backup-paste">
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t('Sicherung hier einfügen')} rows={4} />
            <div className="backup-buttons">
              <button className="btn primary small" disabled={!paste.trim()} onClick={() => restore(paste)}>{t('Einspielen')}</button>
              <button className="btn secondary small" onClick={() => setPaste(null)}>{t('Abbrechen')}</button>
            </div>
          </div>
        )}
        {msg && <p className="backup-msg">{msg}</p>}
      </div>
    </>
  )
}

type ProfileTab = 'stats' | 'games' | 'settings'
const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'stats', label: t('Statistik') },
  { id: 'games', label: t('Partien') },
  { id: 'settings', label: t('Einstellungen') },
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

const OUTCOME = { win: { label: t('Sieg'), short: t('S (Sieg)').charAt(0) }, draw: { label: t('Remis'), short: t('R (Remis)').charAt(0) }, loss: { label: t('Niederlage'), short: t('N (Niederlage)').charAt(0) } }

function GameRow({ g, onOpen }: { g: ArchivedGame; onOpen: () => void }) {
  const bot = findBot(g.botId)
  const date = new Date(g.date).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
  return (
    <button className="game-row" onClick={onOpen}>
      <span className={'outcome ' + g.outcome}>{OUTCOME[g.outcome].short}</span>
      <BotAvatar bot={bot ?? null} size={36} />
      <span className="gr-text">
        <strong>{bot?.name ?? g.botName} <small>({g.botRating})</small></strong>
        <small>{date} · {g.moves === 1 ? t('1 Zug') : t('{n} Züge', { n: g.moves })} · {g.color === 'w' ? t('Weiß') : t('Schwarz')}{g.tc ? ` · ${g.tc}` : ''}{g.accuracy != null ? ` · ${t('Genauigkeit {n}', { n: g.accuracy })}` : ''}</small>
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
        <ReviewScreen history={moves} playerColor={review.color} opponent={findBot(review.botId)?.name ?? review.botName} gameId={review.id} pgn={review.pgn}
          onClose={() => { setReview(null); onPlaying(false) }} />
      </div>
    )
  }

  return (
    <div className="profile-screen">
      <Scene className="scene-head" region={9} offset={-180} />
      <div className="scene-sheet"><h1 className="screen-title">{t('Profil')}</h1></div>

      <div className="segmented three" role="tablist">
        {PROFILE_TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'active' : ''} onClick={() => setTab(x.id)}>{x.label}</button>
        ))}
      </div>

      {tab === 'stats' && <>
      <section className="rating-card">
        <div className="rc-top">
          <div>
            <div className="rc-label">{t('Deine Wertung')}</div>
            <div className="rc-value">{r.rating}{r.games < 10 && <span className="rc-prov" title={t('vorläufig')}>?</span>}</div>
            <div className="rc-sub">{r.games === 0 ? t('Spiele eine gewertete Partie gegen einen Bot, um eingestuft zu werden.') : r.games < 10 ? (10 - r.games === 1 ? t('Vorläufig, noch 1 Partie bis zur festen Wertung.') : t('Vorläufig, noch {n} Partien bis zur festen Wertung.', { n: 10 - r.games })) : t('Beste Wertung {peak} · {n} gewertete Partien', { peak: r.peak, n: r.games })}</div>
          </div>
          {ratedGames.length > 0 && (
            <div className="rc-wdl"><span className="w">{wdl.win}</span><span className="d">{wdl.draw}</span><span className="l">{wdl.loss}</span><small>{OUTCOME.win.short} · {OUTCOME.draw.short} · {OUTCOME.loss.short}</small></div>
          )}
        </div>
        <Sparkline values={[r.start, ...r.history.map((h) => h.r)]} />
        <div className="rc-perf">
          <Icon name="chart" />
          <span>{est
            ? <>{t('Nach der Qualität deiner Züge spielst du etwa wie')} <strong>{est}</strong> {t('Elo (Schnitt der letzten {n} Partien).', { n: Math.min(10, r.perf.length) })}</>
            : <>{t('Nach drei analysierten Partien schätzt die Engine deine Spielstärke auch aus der Qualität deiner Züge.')}</>}</span>
        </div>
        <p className="rc-note">{t('Gewertet werden Partien im Modus „Gewertet“ (ohne Hilfen). Wer eine laufende gewertete Partie für eine neue verlässt, verliert sie. Die Wertung ist eine Schätzung auf Basis der Bot-Stärken, keine offizielle Elo.')}</p>
      </section>

      <div className="profile-hero" style={{ marginTop: 12 }}>
        <div className="level-badge">{level}<small>{t('LEVEL')}</small></div>
        <div className="profile-info">
          <div className="profile-title">{levelTitle(level)}</div>
          <div className="xp-bar"><div style={{ width: `${(into / needed) * 100}%` }} /></div>
          <div className="xp-text">{t('{into} / {needed} XP bis Level {next} · gesamt {xp} XP', { into, needed, next: level + 1, xp: p.xp })}</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><strong><Icon name="flame" /> {p.streak}</strong><span>{t('Tage in Folge')}</span></div>
        <div className="stat"><strong>{wins}/{games}</strong><span>{t('Siege / Partien')}</span></div>
        <div className="stat"><strong><Icon name="star" fill /> {totalStars}</strong><span>{t('Sterne')}</span></div>
        <div className="stat"><strong>{ps.rating}</strong><span>{t('Taktik-Wertung')}</span></div>
        <div className="stat"><strong>{ps.solved}</strong><span>{t('Aufgaben gelöst')}</span></div>
        <div className="stat"><strong>{ps.peak}</strong><span>{t('Beste Wertung')}</span></div>
      </div>

      <div className="section-title">{t('Abzeichen')} <span className="section-count">{Object.keys(p.badges ?? {}).length}/{BADGES.length}</span></div>
      <div className="badge-grid">
        {[...BADGES].sort((a, b) => Number(Boolean(p.badges?.[b.id])) - Number(Boolean(p.badges?.[a.id]))).map((b) => {
          const got = p.badges?.[b.id]
          return (
            <div key={b.id} className={'badge' + (got ? ' got' : '')} title={b.text}>
              <span className="badge-icon"><Icon name={got ? (b.icon as IconName) : 'lock'} /></span>
              <strong>{b.name}</strong>
              <small>{got ? new Date(got).toLocaleDateString(locale()) : b.text}</small>
            </div>
          )
        })}
      </div>

      <div className="section-title">{t('Besiegte Bots')} <span className="section-count">{beaten.length}/{BOTS.length}</span></div>
      <div className="trophy-row">
        {beaten.length === 0 && <p className="empty-note">{t('Noch keiner. Dein erster Sieg landet hier.')}</p>}
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
          {arch.games.length === 0 && <p className="empty-note">{t('Noch keine Partien. Jede beendete Partie wird hier gespeichert, mit Analyse und PGN zum Kopieren.')}</p>}
          {arch.games.map((g) => <GameRow key={g.id} g={g} onOpen={() => { setReview(g); onPlaying(true) }} />)}
        </div>
      )}

      {tab === 'settings' && <>
      <div className="section-title">{t('Sprache')}</div>
      <div className="lang-grid" role="radiogroup" aria-label={t('Sprache')}>
        {LANGS.map((l) => (
          <button key={l.id} role="radio" aria-checked={s.lang === l.id} className={'design-card lang-card' + (s.lang === l.id ? ' active' : '')} onClick={() => switchLanguage(l.id)}>
            <strong>{l.name}</strong>
            <small>{l.sub}</small>
          </button>
        ))}
      </div>
      <p className="setting-note">{t('Texte, Lektionen und Theorie wechseln mit. Die App startet dafür kurz neu.')}</p>

      <div className="section-title">{t('Notation')}</div>
      <div className="lang-grid notation-grid" role="radiogroup" aria-label={t('Notation')}>
        {([['figures', t('Figuren'), '♘\uFE0Ef3 ♕\uFE0Exd8'], ['letters', t('Buchstaben'), letterSample]] as const).map(([id, name, sample]) => (
          <button key={id} role="radio" aria-checked={s.notation === id} className={'design-card lang-card' + (s.notation === id ? ' active' : '')} onClick={() => switchNotation(id)}>
            <strong>{name}</strong>
            <small className="notation-sample">{sample}</small>
          </button>
        ))}
      </div>

      <div className="section-title">{t('Dein Name')}</div>
      <div className="settings-list">
        <div className="setting">
          <input className="name-input" id="player-name" value={s.name} maxLength={20} placeholder={t('Name')} onChange={(e) => settings.set({ name: e.target.value })} aria-label={t('Dein Name')} />
        </div>
      </div>

      <div className="section-title">{t('Stimmung')}</div>
      <div className="design-grid">
        {DESIGNS.map((d) => (
          <button key={d.id} className={'design-card' + (designOf(s.design) === d.id ? ' active' : '')} onClick={() => settings.set({ design: d.id })}>
            <Scene className="design-preview" region={2} offset={-110} mood={d.id}><i style={{ background: d.swatch[1] }} /></Scene>
            <strong>{d.name}</strong>
            <small>{d.desc}</small>
          </button>
        ))}
      </div>

      <div className="section-title">{t('Brett')}</div>
      <div className="board-grid">
        {BOARD_THEMES.map((x) => (
          <button key={x.id} className={'board-choice' + (s.boardTheme === x.id ? ' active' : '')} onClick={() => settings.set({ boardTheme: x.id })}>
            <span className="board-thumb" style={{ backgroundImage: `url(${boardUrl(x.id)})` }} />
            <small>{x.name}</small>
          </button>
        ))}
      </div>

      <div className="section-title">{t('Figuren')}</div>
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
          <span className="color-label">{t('Weiß')}</span>
          {WHITE_COLORS.map((c) => (
            <button key={c.id} title={c.name} aria-label={c.name} className={'color-dot' + (s.whiteColor === c.id ? ' active' : '')} style={{ background: c.swatch }} onClick={() => settings.set({ whiteColor: c.id })} />
          ))}
          <span className="color-name">{WHITE_COLORS.find((c) => c.id === s.whiteColor)?.name}</span>
        </div>
        <div className="color-row">
          <span className="color-label">{t('Schwarz')}</span>
          {BLACK_COLORS.map((c) => (
            <button key={c.id} title={c.name} aria-label={c.name} className={'color-dot' + (s.blackColor === c.id ? ' active' : '')} style={{ background: c.swatch }} onClick={() => settings.set({ blackColor: c.id })} />
          ))}
          <span className="color-name">{BLACK_COLORS.find((c) => c.id === s.blackColor)?.name}</span>
        </div>
      </div>

      <div className="section-title">{t('Klang und Spiel')}</div>
      <div className="settings-list">
        <Toggle k="sound" label={t('Klang')} />
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
        <Toggle k="vibration" label={t('Vibration')} sub={t('Bei Schlagen, Schach und Fehlern')} />
        <div className="setting">
          <span className="setting-label">{t('Zug-Animation')}</span>
        </div>
        <div className="chooser anim-chooser">
          {([['aus', t('Aus')], ['schnell', t('Schnell')], ['normal', t('Normal')], ['langsam', t('Langsam')]] as const).map(([id, label]) => {
            const active = id === 'aus' ? !s.animation : s.animation && s.animSpeed === id
            return (
              <button key={id} className={'choice' + (active ? ' active' : '')} onClick={() => settings.set(id === 'aus' ? { animation: false } : { animation: true, animSpeed: id })}>{label}</button>
            )
          })}
        </div>
        <Toggle k="coordinates" label={t('Koordinaten am Brett')} />
        <Toggle k="coach" label={t('Trainer-Hilfe')} sub={t('Nur in Trainingspartien: warnt vor groben Fehlern')} />
      </div>

      <BackupSection />
      </>}

      {tab === 'settings' && <p className="credits">
        {t('Figuren über das Lichess-Projekt: Staunty, Dubrovny, Cardinal, Fresca, Tatiana (sadsnake1, CC BY-NC-SA 4.0), Cooke (fejfar, CC BY-NC-SA 4.0), Fantasy, Keltisch und Spatial (Maurizio Monge, MIT), Klar (Maxime Chupin, GPLv3+), Rhos (RhosGFX, CC0), Papier (Nikolay Anzarov, CC BY 4.0), Governor (Lichess, AGPLv3+). Bretter: Holzfotos aus dem Lichess-Projekt (AGPLv3+). Porträts: DiceBear „Avataaars“ von Pablo Stanley. Klänge: Kenney (CC0). Taktikaufgaben: Lichess-Puzzle-Datenbank (CC0). Engine: Stockfish 19 (GPLv3).')}
      </p>}
    </div>
  )
}
