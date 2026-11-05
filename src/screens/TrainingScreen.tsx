import { useCallback, useState } from 'react'
import CoordsGame from '../games/CoordsGame'
import KnightGame from '../games/KnightGame'
import { MINI_GAMES, starsFor, type GameLevel, type MiniGame } from '../games/levels'
import { addXp, progress, recordScore, type XpGain } from '../lib/progress'
import { playSound } from '../lib/sound'
import './Training.css'

const Stars = ({ n, size = 16 }: { n: number; size?: number }) => (
  <span className="stars" style={{ fontSize: size }}>
    {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'on' : ''}>★</span>)}
  </span>
)

export default function TrainingScreen({ onPlaying }: { onPlaying: (playing: boolean) => void }) {
  const p = progress.use()
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

  if (active) {
    const { game, level } = active
    const nextLevel = game.levels.find((l) => l.n === level.n + 1)
    return (
      <div className="training-play">
        <header className="game-header">
          <button className="icon-btn" onClick={close} aria-label="Zurück">‹</button>
          <div className="game-title">{game.title} · Level {level.n}</div>
          <span style={{ width: 44 }} />
        </header>
        {game.id === 'coords'
          ? <CoordsGame key={runKey} level={level} onFinish={finish} />
          : <KnightGame key={runKey} level={level} onFinish={finish} />}
        {result && (
          <div className="modal-backdrop">
            <div className="modal">
              <div className="result-emoji">{result.stars === 3 ? '🏆' : result.stars > 0 ? '🎉' : '💪'}</div>
              <h2>{result.stars > 0 ? 'Geschafft!' : 'Fast!'}</h2>
              <Stars n={result.stars} size={34} />
              <p>{game.id === 'coords' ? `${result.score} Felder getroffen` : result.stars === 3 ? 'Ohne einen einzigen Umweg!' : 'Alle Ziele erreicht'}{result.best && result.score > 0 ? ' · neuer Rekord' : ''}</p>
              {result.stars === 0 && <p>Für einen Stern brauchst du {level.stars[0]}.</p>}
              <div className="xp-gain">
                <span className="xp-pill">+{result.gain.amount} XP</span>
                {result.gain.levelUp && <span className="xp-pill level">Level {result.gain.newLevel}!</span>}
              </div>
              <div className="modal-buttons">
                <button className="btn secondary" onClick={() => open(game, level)}>Nochmal</button>
                {nextLevel && result.stars > 0
                  ? <button className="btn primary" onClick={() => open(game, nextLevel)}>Level {nextLevel.n}</button>
                  : <button className="btn primary" onClick={close}>Fertig</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="training-screen">
      <h1 className="screen-title">Training</h1>
      <p className="screen-sub">Kurze Übungen mit Leveln. Jeder Stern bringt XP.</p>

      {MINI_GAMES.map((g) => {
        const total = g.levels.reduce((s, l) => s + (p.stars[l.id] ?? 0), 0)
        return (
          <section key={g.id} className="mg-card">
            <div className="mg-head">
              <span className="mg-icon">{g.icon}</span>
              <div>
                <div className="mg-title">{g.title}</div>
                <div className="mg-teaser">{g.teaser}</div>
              </div>
              <span className="mg-total">{total}/{g.levels.length * 3} ★</span>
            </div>
            <div className="mg-skill">Trainiert: {g.skill}</div>
            <div className="level-path">
              {g.levels.map((l, i) => {
                const stars = p.stars[l.id] ?? 0
                const unlocked = i === 0 || (p.stars[g.levels[i - 1].id] ?? 0) > 0
                return (
                  <button key={l.id} className={'level-node' + (unlocked ? '' : ' locked') + (stars === 3 ? ' perfect' : '')} disabled={!unlocked} onClick={() => open(g, l)}>
                    <span className="level-n">{unlocked ? l.n : '🔒'}</span>
                    <span className="level-name">{l.name}</span>
                    <Stars n={stars} size={12} />
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      <section className="mg-card soon">
        <div className="mg-head">
          <span className="mg-icon">🧩</span>
          <div>
            <div className="mg-title">Taktik, Eröffnungen, Endspiele</div>
            <div className="mg-teaser">Kommen in den nächsten Versionen, ebenfalls mit Leveln und Sternen.</div>
          </div>
        </div>
      </section>
    </div>
  )
}
