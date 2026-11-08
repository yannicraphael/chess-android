import { t } from '../i18n'
import { useEffect, useRef, useState } from 'react'
import { recordDaily } from '../lib/progress'
import { loadPuzzles, motifPool, MOTIF_SET_SIZE, sample, type Puzzle } from '../lib/puzzles'
import Icon from '../components/Icon'
import { MotifTheoryPage } from '../screens/TheoryPage'
import { MOTIF_THEORY } from '../data/learnTheory'
import type { GameLevel } from './levels'
import PuzzlePlayer, { type PuzzleOutcome } from './PuzzlePlayer'

// A motif level: five puzzles of one tactical theme. Score = puzzles solved on the first try.
export default function PuzzleSet({ level, onFinish }: { level: GameLevel; onFinish: (score: number) => void }) {
  const [set, setSet] = useState<Puzzle[] | null>(null)
  const [error, setError] = useState(false)
  const [i, setI] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const finished = useRef(false)
  const theory = level.theme ? MOTIF_THEORY[level.theme] : undefined
  const [showTheory, setShowTheory] = useState(false)

  useEffect(() => {
    loadPuzzles().then((l) => setSet(sample(motifPool(l, level.theme!, level.n), MOTIF_SET_SIZE))).catch(() => setError(true))
  }, [level])

  function onDone(o: PuzzleOutcome) {
    setResults((r) => [...r, o.clean])
    recordDaily('puzzle')
  }

  function next() {
    if (!set) return
    if (i + 1 >= set.length) {
      if (finished.current) return
      finished.current = true
      onFinish(results.filter(Boolean).length)
      return
    }
    setI(i + 1)
  }

  if (error) return <p className="mg-info">{t('Die Aufgaben konnten nicht geladen werden.')}</p>
  if (!set) return <p className="mg-info">{t('Aufgaben werden geladen…')}</p>

  return (
    <div className="minigame">
      {theory && <button className="theory-link pz-theory" onClick={() => setShowTheory(true)}><Icon name="book" /> {t('Theorie zum Motiv')}</button>}
      {showTheory && level.theme && <MotifTheoryPage theme={level.theme} onClose={() => setShowTheory(false)} />}
      <div className="pz-dots">
        {set.map((_, k) => <span key={k} className={k < results.length ? (results[k] ? 'ok' : 'no') : k === i ? 'cur' : ''}>{k < results.length ? (results[k] ? '✓' : '✗') : k + 1}</span>)}
      </div>
      <PuzzlePlayer key={i} puzzle={set[i]} onDone={onDone}
        footer={<div className="puzzle-after"><button className="btn primary big" onClick={next}>{i + 1 >= set.length ? t('Auswertung') : t('Weiter')}</button></div>} />
    </div>
  )
}
