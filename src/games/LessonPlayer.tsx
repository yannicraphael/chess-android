import { t } from '../i18n'
import { Chess, type Color, type Move } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import Board, { type Arrow, type SquarePair } from '../components/Board'
import Icon from '../components/Icon'
import type { Lesson, LessonStep } from '../data/lessons'
import { playSound } from '../lib/sound'

const clean = (san: string) => san.replace(/[+#]/g, '')

function isCorrect(step: LessonStep, fenBefore: string, m: Move, after: Chess) {
  const t = step.task!
  if (t.mate && after.isCheckmate()) return true
  if (t.accept?.some((a) => clean(a) === clean(m.san))) return true
  if (t.safe) {
    // no mate in one for the opponent after this move
    for (const reply of after.moves()) {
      const probe = new Chess(after.fen())
      probe.move(reply)
      if (probe.isCheckmate()) return false
    }
    return fenBefore !== after.fen()
  }
  return false
}

// a correct move to show after repeated mistakes
function solution(step: LessonStep): Arrow | null {
  const t = step.task
  if (!t) return null
  const c = new Chess(step.fen)
  for (const m of c.moves({ verbose: true })) {
    const probe = new Chess(step.fen)
    probe.move(m.san)
    if (isCorrect(step, step.fen, m, probe)) return { from: m.from, to: m.to }
  }
  return null
}

// Shows a lesson step by step. onFinish gets the stars (3 = no mistakes).
export default function LessonPlayer({ lesson, onFinish }: { lesson: Lesson; onFinish: (stars: number) => void }) {
  const [i, setI] = useState(0)
  const step = lesson.steps[i]
  const [fen, setFen] = useState(step.fen)
  const [last, setLast] = useState<SquarePair | null>(null)
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [solved, setSolved] = useState(!step.task)
  const [tries, setTries] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  function goto(n: number) {
    const s = lesson.steps[n]
    setI(n)
    setFen(s.fen)
    setLast(null)
    setMarks({})
    setSolved(!s.task)
    setTries(0)
    setFeedback(null)
  }

  const toMove = step.fen.split(' ')[1] as Color

  function onMove(from: string, to: string, promotion?: string) {
    if (!step.task || solved) return
    const c = new Chess(step.fen)
    let m: Move
    try { m = c.move({ from, to, promotion }) } catch { return }
    setFen(c.fen())
    setLast({ from: m.from, to: m.to })
    if (isCorrect(step, step.fen, m, c)) {
      if (c.isCheckmate()) playSound('check')
      else playSound(m.captured ? 'capture' : 'move')
      window.setTimeout(() => playSound('correct'), 120)
      setMarks({ [m.to]: 'mark-good' })
      setSolved(true)
      setFeedback({ text: step.task.success, tone: 'good' })
    } else {
      playSound('wrong')
      setMarks({ [m.to]: 'mark-bad' })
      setMistakes((n) => n + 1)
      setTries((t) => t + 1)
      setFeedback({ text: tries >= 1 ? t('Nicht ganz. Der Pfeil zeigt dir einen richtigen Zug.') : t('Nicht ganz. Versuch es nochmal.'), tone: 'bad' })
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => { setFen(step.fen); setLast(null); setMarks({}) }, 700)
    }
  }

  function next() {
    if (i + 1 < lesson.steps.length) goto(i + 1)
    else onFinish(mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1)
  }

  const arrows: Arrow[] = [...(step.arrows ?? [])]
  if (step.task && !solved && tries >= 2) {
    const sol = solution(step)
    if (sol) arrows.push(sol)
  }
  const shownMarks = { ...(step.marks ?? {}), ...marks }

  return (
    <div className="puzzle-player lesson-player">
      <div className="ot-progress" aria-label={t('Schritt {a} von {b}', { a: i + 1, b: lesson.steps.length })}>
        {lesson.steps.map((_, k) => <span key={k} className={k <= i ? 'on' : ''} />)}
      </div>
      <Board fen={fen} orientation={step.task ? toMove : 'w'} movableColor={step.task && !solved ? toMove : null} lastMove={last} marks={shownMarks} arrows={solved && step.task ? [] : arrows} onMove={onMove} />
      <div className="lesson-text">
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        {step.task && !feedback && <p className="lesson-task"><Icon name="target" /> {step.task.prompt}</p>}
        {feedback && <p className={'lesson-feedback ' + feedback.tone}>{feedback.text}</p>}
      </div>
      <div className="puzzle-tools">
        {i > 0 && <button className="btn secondary small" onClick={() => goto(i - 1)}><Icon name="back" /> {t('Zurück')}</button>}
        <button className="btn primary small" onClick={next} disabled={!solved}>{i + 1 < lesson.steps.length ? t('Weiter') : t('Abschließen')} <Icon name="next" /></button>
      </div>
    </div>
  )
}
