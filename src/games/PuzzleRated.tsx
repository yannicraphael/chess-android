import { useEffect, useState } from 'react'
import { addXp, recordDaily } from '../lib/progress'
import { loadPuzzles, pickRated, puzzleStats, ratingDelta, themeLabels, type Puzzle } from '../lib/puzzles'
import { playSound } from '../lib/sound'
import Icon from '../components/Icon'
import PuzzlePlayer, { type PuzzleOutcome } from './PuzzlePlayer'

// Endless rated puzzles that adapt to the player's tactics rating.
export default function PuzzleRated({ onExit, firstId }: { onExit: () => void; firstId?: string }) {
  const st = puzzleStats.use()
  const [list, setList] = useState<Puzzle[] | null>(null)
  const [error, setError] = useState(false)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<{ delta: number; ok: boolean; xp: number; levelUp: number | null } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    loadPuzzles().then((l) => {
      setList(l)
      setPuzzle((firstId && l.find((p) => p.id === firstId)) || pickRated(l, puzzleStats.get().rating, puzzleStats.get().seen))
    }).catch(() => setError(true))
  }, [firstId])

  function next() {
    if (!list) return
    setResult(null)
    setFailed(false)
    setPuzzle(pickRated(list, puzzleStats.get().rating, puzzleStats.get().seen, puzzle?.id))
    setRun((r) => r + 1)
  }

  // the rating changes at the first mistake (like on the big sites); hints keep the rating unchanged
  function settle(ok: boolean, rated: boolean) {
    if (!puzzle) return
    const s = puzzleStats.get()
    const delta = rated ? ratingDelta(s.rating, puzzle.rating, ok, s.played) : 0
    const rating = Math.max(100, s.rating + delta)
    const streak = ok ? s.streak + 1 : 0
    puzzleStats.set({
      rating,
      peak: Math.max(s.peak, rating),
      played: s.played + (rated ? 1 : 0),
      solved: s.solved + (ok ? 1 : 0),
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      seen: [...s.seen.filter((id) => id !== puzzle.id), puzzle.id].slice(-1500),
      recent: [{ id: puzzle.id, ok, delta }, ...s.recent].slice(0, 20),
    })
    recordDaily('puzzle')
    const gain = addXp(ok ? (rated ? 6 : 3) : 1)
    if (gain.levelUp) setTimeout(() => playSound('levelup'), 600)
    setResult({ delta, ok, xp: gain.amount, levelUp: gain.levelUp ? gain.newLevel : null })
  }

  function onMistake() {
    if (failed || result) return
    setFailed(true)
    settle(false, true)
  }

  function onDone(o: PuzzleOutcome) {
    if (result || failed) return
    if (o.revealed) settle(false, true)
    else settle(true, !o.hinted)
  }

  const recent = st.recent.slice(0, 10).reverse()

  return (
    <div className="training-play">
      <header className="game-header">
        <button className="icon-btn" onClick={onExit} aria-label="Zurück"><Icon name="back" /></button>
        <div className="game-title">{firstId && puzzle?.id === firstId ? 'Aufgabe des Tages' : 'Taktik-Training'}</div>
        <span style={{ width: 44 }} />
      </header>
      <div className="puzzle-hud">
        <div className="pz-rating">
          <span className="pz-rating-label">Deine Wertung</span>
          <span className="pz-rating-val">{st.rating}{result && result.delta !== 0 && <em className={result.delta > 0 ? 'up' : 'down'}>{result.delta > 0 ? '+' : ''}{result.delta}</em>}</span>
        </div>
        <div className="pz-recent">{recent.map((r, i) => <span key={i} className={r.ok ? 'ok' : 'no'}>{r.ok ? '✓' : '✗'}</span>)}</div>
        {st.streak > 1 && <div className="pz-streak"><Icon name="flame" /> {st.streak}</div>}
      </div>
      {error && <p className="mg-info">Die Aufgaben konnten nicht geladen werden. Bitte prüfe die Internetverbindung.</p>}
      {!puzzle && !error && <p className="mg-info">Aufgaben werden geladen…</p>}
      {puzzle && (
        <PuzzlePlayer key={run} puzzle={puzzle} onMistake={onMistake} onDone={onDone}
          footer={
            <div className="puzzle-after">
              <div className="pz-info">
                Aufgabe {puzzle.rating}
                {themeLabels(puzzle).length > 0 && <> · {themeLabels(puzzle).slice(0, 3).join(', ')}</>}
              </div>
              {result && (
                <div className="xp-gain">
                  <span className="xp-pill">+{result.xp} XP</span>
                  {result.levelUp && <span className="xp-pill level">Level {result.levelUp}!</span>}
                </div>
              )}
              <button className="btn primary big" onClick={next}>Nächste Aufgabe</button>
            </div>
          } />
      )}
    </div>
  )
}
