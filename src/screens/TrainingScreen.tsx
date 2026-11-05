import Icon, { type IconName } from '../components/Icon'
import { pieceUrl } from '../lib/settings'
import { useCallback, useState } from 'react'
import CoordsGame from '../games/CoordsGame'
import KnightGame from '../games/KnightGame'
import PuzzleRated from '../games/PuzzleRated'
import PuzzleSet from '../games/PuzzleSet'
import PuzzleSprint from '../games/PuzzleSprint'
import { MINI_GAMES, MOTIF_GAMES, SPRINT, starsFor, type GameLevel, type MiniGame } from '../games/levels'
import { addXp, progress, recordScore, type XpGain } from '../lib/progress'
import { puzzleStats } from '../lib/puzzles'
import { playSound } from '../lib/sound'
import './Training.css'

const Stars = ({ n, size = 16 }: { n: number; size?: number }) => (
  <span className="stars" style={{ fontSize: size }}>
    {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'on' : ''}><Icon name="star" fill /></span>)}
  </span>
)

function resultText(game: MiniGame, score: number, stars: number) {
  switch (game.kind) {
    case 'coords': return `${score} Felder getroffen`
    case 'knight': return stars === 3 ? 'Ohne einen einzigen Umweg!' : 'Alle Ziele erreicht'
    case 'sprint': return `${score} ${score === 1 ? 'Aufgabe' : 'Aufgaben'} gelöst`
    case 'motif': return `${score} von 5 auf Anhieb gelöst`
  }
}

function LevelPath({ game, stars, onOpen, compact }: { game: MiniGame; stars: Record<string, number>; onOpen: (l: GameLevel) => void; compact?: boolean }) {
  return (
    <div className={'level-path' + (compact ? ' compact' : '')}>
      {game.levels.map((l, i) => {
        const n = stars[l.id] ?? 0
        const unlocked = i === 0 || (stars[game.levels[i - 1].id] ?? 0) > 0
        return (
          <button key={l.id} className={'level-node' + (unlocked ? '' : ' locked') + (n === 3 ? ' perfect' : '')} disabled={!unlocked} onClick={() => onOpen(l)}>
            <span className="level-n">{unlocked ? l.n : <Icon name="lock" />}</span>
            {!compact && <span className="level-name">{l.name}</span>}
            <Stars n={n} size={12} />
          </button>
        )
      })}
    </div>
  )
}

export default function TrainingScreen({ section, onPlaying }: { section: 'tactics' | 'learn'; onPlaying: (playing: boolean) => void }) {
  const p = progress.use()
  const ps = puzzleStats.use()
  const [rated, setRated] = useState(false)
  const [active, setActive] = useState<{ game: MiniGame; level: GameLevel } | null>(null)
  const [result, setResult] = useState<{ score: number; stars: number; gain: XpGain; best: boolean } | null>(null)
  const [runKey, setRunKey] = useState(0)

  function open(game: MiniGame, level: GameLevel) {
    setActive({ game, level })
    setResult(null)
    setRunKey((k) => k + 1)
    onPlaying(true)
  }

  function close() {
    setActive(null)
    setRated(false)
    setResult(null)
    onPlaying(false)
  }

  const finish = useCallback((score: number) => {
    if (!active) return
    const stars = starsFor(active.level, score)
    const before = progress.get().stars[active.level.id] ?? 0
    const best = score > (progress.get().best[active.level.id] ?? 0)
    recordScore(active.level.id, score, stars)
    // XP for playing plus a bonus for every newly earned star
    const gain = addXp(5 + stars * 5 + Math.max(0, stars - before) * 15)
    playSound(stars > 0 ? 'win' : 'draw')
    if (gain.levelUp) setTimeout(() => playSound('levelup'), 700)
    setResult({ score, stars, gain, best })
  }, [active])

  if (rated) return <PuzzleRated onExit={close} />

  if (active) {
    const { game, level } = active
    const nextLevel = game.levels.find((l) => l.n === level.n + 1)
    return (
      <div className="training-play">
        <header className="game-header">
          <button className="icon-btn" onClick={close} aria-label="Zurück"><Icon name="back" /></button>
          <div className="game-title">{game.title} · {game.kind === 'motif' ? level.name : `Level ${level.n}`}</div>
          <span style={{ width: 44 }} />
        </header>
        {game.kind === 'coords' && <CoordsGame key={runKey} level={level} onFinish={finish} />}
        {game.kind === 'knight' && <KnightGame key={runKey} level={level} onFinish={finish} />}
        {game.kind === 'sprint' && <PuzzleSprint key={runKey} level={level} onFinish={finish} />}
        {game.kind === 'motif' && <PuzzleSet key={runKey} level={level} onFinish={finish} />}
        {result && (
          <div className="modal-backdrop">
            <div className="modal">
              <div className={'result-icon ' + (result.stars > 0 ? 'win' : 'draw')}><Icon name={result.stars === 3 ? 'trophy' : result.stars > 0 ? 'star' : 'refresh'} fill={result.stars > 0 && result.stars < 3} /></div>
              <h2>{result.stars > 0 ? 'Geschafft!' : 'Fast!'}</h2>
              <Stars n={result.stars} size={34} />
              <p>{resultText(game, result.score, result.stars)}{result.best && result.score > 0 && game.kind !== 'knight' ? ' · neuer Rekord' : ''}</p>
              {result.stars === 0 && <p>Für einen Stern brauchst du {level.stars[0]}.</p>}
              <div className="xp-gain">
                <span className="xp-pill">+{result.gain.amount} XP</span>
                {result.gain.levelUp && <span className="xp-pill level">Level {result.gain.newLevel}!</span>}
              </div>
              <div className="modal-buttons">
                <button className="btn secondary" onClick={() => open(game, level)}>Nochmal</button>
                {nextLevel && result.stars > 0
                  ? <button className="btn primary" onClick={() => open(game, nextLevel)}>{game.kind === 'motif' ? nextLevel.name : `Level ${nextLevel.n}`}</button>
                  : <button className="btn primary" onClick={close}>Fertig</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const card = (g: MiniGame) => {
    const total = g.levels.reduce((s, l) => s + (p.stars[l.id] ?? 0), 0)
    return (
      <section key={g.id} className="mg-card">
        <div className="mg-head">
          <span className="mg-icon"><Icon name={g.icon as IconName} /></span>
          <div>
            <div className="mg-title">{g.title}</div>
            <div className="mg-teaser">{g.teaser}</div>
          </div>
          <span className="mg-total">{total}/{g.levels.length * 3} <Icon name="star" fill /></span>
        </div>
        <div className="mg-skill">Trainiert: {g.skill}</div>
        <LevelPath game={g} stars={p.stars} onOpen={(l) => open(g, l)} />
      </section>
    )
  }
  const motifStars = MOTIF_GAMES.reduce((s, g) => s + g.levels.reduce((a, l) => a + (p.stars[l.id] ?? 0), 0), 0)

  return (
    <div className="training-screen">
      <h1 className="screen-title">{section === 'tactics' ? 'Taktik' : 'Lernen'}</h1>
      <p className="screen-sub">{section === 'tactics' ? 'Muster erkennen, rechnen, gewinnen. Jede Lösung bringt XP.' : 'Kurze Übungen mit Leveln. Jeder Stern bringt XP.'}</p>

      {section === 'tactics' && <>
      <button className="mg-card rated-card" onClick={() => { setRated(true); onPlaying(true) }}>
        <div className="mg-head">
          <span className="mg-icon"><Icon name="puzzle" /></span>
          <div>
            <div className="mg-title">Taktik-Training</div>
            <div className="mg-teaser">Endlos Aufgaben, die zu deiner Stärke passen. Deine Wertung steigt mit jeder Lösung.</div>
          </div>
        </div>
        <div className="rated-row">
          <span className="rated-val">{ps.rating}<small>Wertung</small></span>
          <span className="rated-val">{ps.solved}<small>gelöst</small></span>
          <span className="rated-val">{ps.bestStreak}<small>beste Serie</small></span>
          <span className="btn primary small">Start</span>
        </div>
      </button>

      {card(SPRINT)}

      <section className="mg-card">
        <div className="mg-head">
          <span className="mg-icon"><Icon name="learn" /></span>
          <div>
            <div className="mg-title">Taktische Motive</div>
            <div className="mg-teaser">Je 5 Aufgaben zu einem Motiv. 3 Sterne, wenn du alle auf Anhieb löst.</div>
          </div>
          <span className="mg-total">{motifStars}/{MOTIF_GAMES.length * 9} <Icon name="star" fill /></span>
        </div>
        <div className="motif-list">
          {MOTIF_GAMES.map((g) => (
            <div key={g.id} className="motif-row">
              <img className="motif-icon" src={pieceUrl(g.icon[0] as 'w' | 'b', g.icon[1])} alt="" />
              <div className="motif-text"><strong>{g.title}</strong><small>{g.teaser}</small></div>
              <LevelPath game={g} stars={p.stars} onOpen={(l) => open(g, l)} compact />
            </div>
          ))}
        </div>
      </section>

      </>}

      {section === 'learn' && <>
      <h2 className="hub-title">Brett-Gefühl</h2>
      {MINI_GAMES.map(card)}

      <section className="mg-card soon">
        <div className="mg-head">
          <span className="mg-icon"><Icon name="book" /></span>
          <div>
            <div className="mg-title">Eröffnungen und Endspiele</div>
            <div className="mg-teaser">Kommen in den nächsten Versionen, ebenfalls mit Leveln und Sternen.</div>
          </div>
        </div>
      </section>
      </>}
    </div>
  )
}
