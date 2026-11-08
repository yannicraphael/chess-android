import { t } from '../i18n'
import Icon, { type IconName } from '../components/Icon'
import { pieceUrl } from '../lib/settings'
import { useCallback, useState } from 'react'
import CoordsGame from '../games/CoordsGame'
import EndgameTrainer from '../games/EndgameTrainer'
import LessonPlayer from '../games/LessonPlayer'
import MistakeTrainer from '../games/MistakeTrainer'
import OpeningTrainer from '../games/OpeningTrainer'
import { archive, dueMistakes } from '../lib/archive'
import { ENDGAMES, ENDGAME_GROUPS } from '../data/endgames'
import { LESSONS } from '../data/lessons'
import { OPENINGS } from '../data/openings'
import KnightGame from '../games/KnightGame'
import SpotGame from '../games/SpotGame'
import PuzzleRated from '../games/PuzzleRated'
import PuzzleSet from '../games/PuzzleSet'
import PuzzleSprint from '../games/PuzzleSprint'
import { ENDGAME_GAMES, LESSON_GAMES, MINI_GAMES, MOTIF_GAMES, OPENING_GAMES, SPRINT, starsFor, type GameLevel, type MiniGame } from '../games/levels'
import { useBack } from '../lib/back'
import { addXp, progress, recordScore, recordWeekly, type XpGain } from '../lib/progress'
import { puzzleStats } from '../lib/puzzles'
import { playSound } from '../lib/sound'
import Scene from '../components/Scene'
import './Training.css'
import { EndgameTheoryPage, MotifTheoryPage, OpeningTheoryPage } from './TheoryPage'

const Stars = ({ n, size = 16 }: { n: number; size?: number }) => (
  <span className="stars" style={{ fontSize: size }}>
    {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'on' : ''}><Icon name="star" fill /></span>)}
  </span>
)

function resultText(game: MiniGame, score: number, stars: number) {
  switch (game.kind) {
    case 'coords': return score === 1 ? t('1 Feld getroffen') : t('{n} Felder getroffen', { n: score })
    case 'hanging': return score === 1 ? t('1 ungedeckte Figur geschlagen') : t('{n} ungedeckte Figuren geschlagen', { n: score })
    case 'mate1': return score === 1 ? t('1 Matt gefunden') : t('{n} Matts gefunden', { n: score })
    case 'knight': return stars === 3 ? t('Ohne einen einzigen Umweg!') : t('Alle Ziele erreicht')
    case 'sprint': return score === 1 ? t('1 Aufgabe gelöst') : t('{n} Aufgaben gelöst', { n: score })
    case 'motif': return t('{n} von 5 auf Anhieb gelöst', { n: score })
    case 'opening': return stars === 3 ? t('Ohne Fehler gespielt') : t('Variante geschafft')
    case 'endgame': return t('Aufgabe gelöst')
    case 'lesson': return stars === 3 ? t('Lektion ohne Fehler abgeschlossen') : t('Lektion abgeschlossen')
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

type LearnTab = 'wissen' | 'eroeffnungen' | 'endspiele' | 'uebungen'
const LEARN_TABS: { id: LearnTab; label: string }[] = [
  { id: 'wissen', label: t('Wissen') },
  { id: 'eroeffnungen', label: t('Eröffnungen') },
  { id: 'endspiele', label: t('Endspiele') },
  { id: 'uebungen', label: t('Übungen') },
]
function loadLearnTab(): LearnTab {
  try { return (localStorage.getItem('learnTab') as LearnTab) || 'wissen' } catch { return 'wissen' }
}

const PieceIcon = ({ code }: { code: string }) => <img className={'motif-icon' + (code[0] === 'b' ? ' dark-piece' : '')} src={pieceUrl(code[0] as 'w' | 'b', code[1])} alt="" />

function TheoryFor({ game, onClose, onPractice }: { game: MiniGame; onClose: () => void; onPractice: () => void }) {
  if (game.kind === 'opening') return <OpeningTheoryPage opening={OPENINGS.find((o) => o.id === game.ref)!} onClose={onClose} onPractice={onPractice} />
  if (game.kind === 'endgame') return <EndgameTheoryPage endgame={ENDGAMES.find((e) => e.id === game.ref)!} onClose={onClose} onPractice={onPractice} />
  if (game.kind === 'motif' && game.levels[0].theme) return <MotifTheoryPage theme={game.levels[0].theme} onClose={onClose} onPractice={onPractice} />
  return null
}

export default function TrainingScreen({ section, onPlaying }: { section: 'tactics' | 'learn'; onPlaying: (playing: boolean) => void }) {
  const p = progress.use()
  const ps = puzzleStats.use()
  const [rated, setRated] = useState(false)
  const [mistakesMode, setMistakesMode] = useState(false)
  const mistakes = archive.use().mistakes
  const openMistakes = dueMistakes().length
  const [active, setActive] = useState<{ game: MiniGame; level: GameLevel } | null>(null)
  // a theory page opened from the lists, with the game to practise afterwards
  const [theoryFor, setTheoryFor] = useState<{ game: MiniGame } | null>(null)
  useBack(() => close(), !!active)
  const [result, setResult] = useState<{ score: number; stars: number; gain: XpGain; best: boolean } | null>(null)
  const [runKey, setRunKey] = useState(0)
  const [learnTab, setLearnTabState] = useState<LearnTab>(loadLearnTab)
  const setLearnTab = (t: LearnTab) => {
    setLearnTabState(t)
    try { localStorage.setItem('learnTab', t) } catch { /* ignore */ }
  }

  function open(game: MiniGame, level: GameLevel) {
    setActive({ game, level })
    setResult(null)
    setRunKey((k) => k + 1)
    onPlaying(true)
  }

  function close() {
    setActive(null)
    setRated(false)
    setMistakesMode(false)
    setResult(null)
    onPlaying(false)
  }

  const finish = useCallback((score: number) => {
    if (!active) return
    const stars = starsFor(active.level, score)
    const before = progress.get().stars[active.level.id] ?? 0
    const best = score > (progress.get().best[active.level.id] ?? 0)
    recordScore(active.level.id, score, stars)
    if (stars > 0 && (active.game.kind === 'opening' || active.game.kind === 'endgame' || active.game.kind === 'lesson')) recordWeekly('learn')
    // XP for playing plus a bonus for every newly earned star
    const gain = addXp(5 + stars * 5 + Math.max(0, stars - before) * 15)
    playSound(stars > 0 ? 'win' : 'draw')
    if (gain.levelUp) setTimeout(() => playSound('levelup'), 700)
    setResult({ score, stars, gain, best })
  }, [active])

  if (rated) return <PuzzleRated onExit={close} />
  if (mistakesMode) return <MistakeTrainer onExit={close} />

  if (active) {
    const { game, level } = active
    const nextLevel = game.levels.find((l) => l.n === level.n + 1)
    return (
      <div className="training-play">
        <header className="game-header">
          <button className="icon-btn" onClick={close} aria-label={t('Zurück')}><Icon name="back" /></button>
          <div className="game-title">{game.kind === 'endgame' || game.kind === 'lesson' ? game.title : `${game.title} · ${game.kind === 'motif' || game.kind === 'opening' ? level.name : t('Level {n}', { n: level.n })}`}</div>
          <span style={{ width: 44 }} />
        </header>
        {game.kind === 'coords' && <CoordsGame key={runKey} level={level} onFinish={finish} />}
        {game.kind === 'knight' && <KnightGame key={runKey} level={level} onFinish={finish} />}
        {(game.kind === 'hanging' || game.kind === 'mate1') && <SpotGame key={runKey} mode={game.kind} level={level} onFinish={finish} />}
        {game.kind === 'sprint' && <PuzzleSprint key={runKey} level={level} onFinish={finish} />}
        {game.kind === 'motif' && <PuzzleSet key={runKey} level={level} onFinish={finish} />}
        {game.kind === 'opening' && <OpeningTrainer key={runKey} opening={OPENINGS.find((o) => o.id === game.ref)!} level={level.n} onFinish={finish} />}
        {game.kind === 'endgame' && <EndgameTrainer key={runKey} endgame={ENDGAMES.find((e) => e.id === game.ref)!} onFinish={finish} />}
        {game.kind === 'lesson' && <LessonPlayer key={runKey} lesson={LESSONS.find((l) => l.id === game.ref)!} onFinish={finish} />}
        {result && (
          <div className="modal-backdrop">
            <div className="modal">
              <div className={'result-icon ' + (result.stars > 0 ? 'win' : 'draw')}><Icon name={result.stars === 3 ? 'trophy' : result.stars > 0 ? 'star' : 'refresh'} fill={result.stars > 0 && result.stars < 3} /></div>
              <h2>{result.stars > 0 ? t('Geschafft!') : t('Fast!')}</h2>
              <Stars n={result.stars} size={34} />
              <p>{resultText(game, result.score, result.stars)}{result.best && result.score > 0 && ['coords', 'sprint', 'motif', 'hanging', 'mate1'].includes(game.kind) ? ` · ${t('neuer Rekord')}` : ''}</p>
              {result.stars === 0 && <p>{t('Für einen Stern brauchst du {n}.', { n: level.stars[0] })}</p>}
              <div className="xp-gain">
                <span className="xp-pill">+{result.gain.amount} XP</span>
                {result.gain.levelUp && <span className="xp-pill level">{t('Level {n}!', { n: result.gain.newLevel })}</span>}
              </div>
              <div className="modal-buttons">
                <button className="btn secondary" onClick={() => open(game, level)}>{t('Nochmal')}</button>
                {nextLevel && result.stars > 0
                  ? <button className="btn primary" onClick={() => open(game, nextLevel)}>{game.kind === 'motif' || game.kind === 'opening' ? nextLevel.name : t('Level {n}', { n: nextLevel.n })}</button>
                  : <button className="btn primary" onClick={close}>{t('Fertig')}</button>}
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
        <div className="mg-skill">{t('Trainiert:')} {g.skill}</div>
        <LevelPath game={g} stars={p.stars} onOpen={(l) => open(g, l)} />
      </section>
    )
  }
  const starSum = (games: MiniGame[]) => games.reduce((s, g) => s + g.levels.reduce((a, l) => a + (p.stars[l.id] ?? 0), 0), 0)
  const motifStars = MOTIF_GAMES.reduce((s, g) => s + g.levels.reduce((a, l) => a + (p.stars[l.id] ?? 0), 0), 0)

  return (
    <div className="training-screen">
      {theoryFor && <TheoryFor game={theoryFor.game} onClose={() => setTheoryFor(null)} onPractice={() => { const g = theoryFor.game; setTheoryFor(null); open(g, g.levels[0]) }} />}
      <Scene className="scene-head" region={section === 'tactics' ? 4 : 3} offset={section === 'tactics' ? -250 : -262} />
      <div className="scene-sheet">
        <h1 className="screen-title">{section === 'tactics' ? t('Taktik') : t('Lernen')}</h1>
        <p className="screen-sub">{section === 'tactics' ? t('Muster erkennen, rechnen, gewinnen. Jede Lösung bringt XP.') : t('Wissen, Eröffnungen und Endspiele. Jeder Stern bringt XP.')}</p>
      </div>

      {section === 'tactics' && <>
      <button className="mg-card rated-card" onClick={() => { setRated(true); onPlaying(true) }}>
        <div className="mg-head">
          <span className="mg-icon"><Icon name="puzzle" /></span>
          <div>
            <div className="mg-title">{t('Taktik-Training')}</div>
            <div className="mg-teaser">{t('Endlos Aufgaben, die zu deiner Stärke passen. Deine Wertung steigt mit jeder Lösung.')}</div>
          </div>
        </div>
        <div className="rated-row">
          <span className="rated-val">{ps.rating}<small>{t('Wertung')}</small></span>
          <span className="rated-val">{ps.solved}<small>{t('gelöst')}</small></span>
          <span className="rated-val">{ps.bestStreak}<small>{t('beste Serie')}</small></span>
          <span className="btn primary small">{t('Start')}</span>
        </div>
      </button>

      <button className="mg-card rated-card mistakes-card" onClick={() => { setMistakesMode(true); onPlaying(true) }}>
        <div className="mg-head">
          <span className="mg-icon"><Icon name="target" /></span>
          <div>
            <div className="mg-title">{t('Eigene Fehler')}</div>
            <div className="mg-teaser">{mistakes.length === 0 ? t('Nach jeder Partie werden deine klaren Fehler hier zu Aufgaben.') : t('Stellungen aus deinen Partien. Gelöste kommen nach 3, 10 und 30 Tagen wieder, bis sie sitzen.')}</div>
          </div>
          <span className="mg-total">{openMistakes > 0 ? t('{n} offen', { n: openMistakes }) : mistakes.length > 0 ? t('alle erledigt') : ''}</span>
        </div>
      </button>

      {card(SPRINT)}

      <section className="mg-card">
        <div className="mg-head">
          <span className="mg-icon"><Icon name="learn" /></span>
          <div>
            <div className="mg-title">{t('Taktische Motive')}</div>
            <div className="mg-teaser">{t('Je 5 Aufgaben zu einem Motiv. 3 Sterne, wenn du alle auf Anhieb löst.')}</div>
          </div>
          <span className="mg-total">{motifStars}/{MOTIF_GAMES.length * 9} <Icon name="star" fill /></span>
        </div>
        <div className="motif-list">
          {MOTIF_GAMES.map((g) => (
            <div key={g.id} className="motif-row">
              <img className="motif-icon" src={pieceUrl(g.icon[0] as 'w' | 'b', g.icon[1])} alt="" />
              <div className="motif-text"><strong>{g.title}</strong><small>{g.teaser}</small>
                <button className="theory-link" onClick={() => setTheoryFor({ game: g })}><Icon name="book" /> {t('Theorie')}</button>
              </div>
              <LevelPath game={g} stars={p.stars} onOpen={(l) => open(g, l)} compact />
            </div>
          ))}
        </div>
      </section>

      </>}

      {section === 'learn' && <>
      <div className="segmented" role="tablist">
        {LEARN_TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={learnTab === x.id} className={learnTab === x.id ? 'active' : ''} onClick={() => setLearnTab(x.id)}>{x.label}</button>
        ))}
      </div>

      {learnTab === 'wissen' && (
        <section className="mg-card">
          <div className="mg-head">
            <span className="mg-icon"><Icon name="book" /></span>
            <div>
              <div className="mg-title">{t('Schachwissen')}</div>
              <div className="mg-teaser">{t('Kurze Lektionen mit Übungsbrett. Jede dauert zwei bis drei Minuten.')}</div>
            </div>
            <span className="mg-total">{starSum(LESSON_GAMES)}/{LESSON_GAMES.length * 3} <Icon name="star" fill /></span>
          </div>
          <div className="motif-list">
            {LESSON_GAMES.map((g) => (
              <button key={g.id} className="motif-row row-button" onClick={() => open(g, g.levels[0])}>
                <PieceIcon code={g.icon} />
                <div className="motif-text"><strong>{g.title}</strong><small>{g.teaser}</small></div>
                <Stars n={p.stars[g.levels[0].id] ?? 0} size={13} />
              </button>
            ))}
          </div>
        </section>
      )}

      {learnTab === 'eroeffnungen' && (['w', 'b'] as const).map((side) => {
        const games = OPENING_GAMES.filter((g) => OPENINGS.find((o) => o.id === g.ref)!.side === side)
        return (
          <section key={side} className="mg-card">
            <div className="mg-head">
              <span className="mg-icon"><PieceIcon code={side + 'N'} /></span>
              <div>
                <div className="mg-title">{side === 'w' ? t('Mit Weiß') : t('Mit Schwarz')}</div>
                <div className="mg-teaser">{side === 'w' ? t('Dein Repertoire für den ersten Zug.') : t('Antworten auf 1.e4 und 1.d4.')} {t('Je drei Stufen: kennenlernen, mit Hilfe, auswendig.')}</div>
              </div>
              <span className="mg-total">{starSum(games)}/{games.length * 9} <Icon name="star" fill /></span>
            </div>
            <div className="motif-list">
              {games.map((g) => (
                <div key={g.id} className="motif-row">
                  <div className="motif-text"><strong>{g.title}</strong><small>{g.teaser}</small>
                    <button className="theory-link" onClick={() => setTheoryFor({ game: g })}><Icon name="book" /> {t('Theorie')}</button>
                  </div>
                  <LevelPath game={g} stars={p.stars} onOpen={(l) => open(g, l)} compact />
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {learnTab === 'endspiele' && ENDGAME_GROUPS.map((grp) => {
        const games = ENDGAME_GAMES.filter((g) => g.icon === grp.id)
        return (
          <section key={grp.id} className="mg-card">
            <div className="mg-head">
              <span className="mg-icon"><PieceIcon code={grp.id === 'matt' ? 'wK' : grp.id === 'bauern' ? 'wP' : grp.id === 'figuren' ? 'wQ' : 'wR'} /></span>
              <div>
                <div className="mg-title">{grp.title}</div>
                <div className="mg-teaser">{grp.teaser} {t('Du spielst gegen die volle Engine.')}</div>
              </div>
              <span className="mg-total">{starSum(games)}/{games.length * 3} <Icon name="star" fill /></span>
            </div>
            <div className="motif-list">
              {games.map((g) => (
                <div key={g.id} className="motif-row">
                  <div className="motif-text"><strong>{g.title}</strong><small>{g.teaser}</small>
                    <button className="theory-link" onClick={() => setTheoryFor({ game: g })}><Icon name="book" /> {t('Theorie')}</button>
                  </div>
                  <LevelPath game={g} stars={p.stars} onOpen={(l) => open(g, l)} compact />
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {learnTab === 'uebungen' && MINI_GAMES.map(card)}
      </>}
    </div>
  )
}
