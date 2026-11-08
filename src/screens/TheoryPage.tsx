import { t } from '../i18n'
import { Chess, type Color } from 'chess.js'
import { useEffect, useState, type ReactNode } from 'react'
import Diagram from '../components/Diagram'
import Icon from '../components/Icon'
import LineViewer from '../components/LineViewer'
import type { Endgame } from '../data/endgames'
import { ENDGAME_THEORY, MOTIF_THEORY } from '../data/learnTheory'
import type { Opening } from '../data/openings'
import { OPENING_THEORY } from '../data/openingTheory'
import { useBack } from '../lib/back'
import { moveText } from '../lib/chessText'
import { hasTheme, loadPuzzles, MOTIFS, type Puzzle } from '../lib/puzzles'
import './TheoryPage.css'

// Full-screen theory pages: an opening, an endgame or a tactical motif explained with position pictures.

function Shell({ title, onClose, children, action }: { title: string; onClose: () => void; children: ReactNode; action?: { label: string; onClick: () => void } }) {
  useBack(() => { onClose(); return true }, true)
  return (
    <div className="theory-page" role="dialog" aria-label={title}>
      <header className="game-header tp-header">
        <button className="icon-btn" onClick={onClose} aria-label={t('Zurück')}><Icon name="back" /></button>
        <div className="game-title">{title}</div>
        <span style={{ width: 44 }} />
      </header>
      <div className="tp-body">
        {children}
        {action && <button className="btn primary big tp-action" onClick={action.onClick}>{action.label}</button>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="tp-section"><h2>{title}</h2>{children}</section>
}

const List = ({ items, numbered }: { items: ReactNode[]; numbered?: boolean }) =>
  numbered ? <ol className="tp-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ol> : <ul className="tp-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>

// arrow for a SAN move played from the position after `moves`
function arrowFor(moves: string[], san: string) {
  const c = new Chess()
  for (const m of moves) c.move(m)
  const mv = c.move(san)
  return [{ from: mv.from, to: mv.to }]
}

export function OpeningTheoryPage({ opening, onClose, onPractice }: { opening: Opening; onClose: () => void; onPractice?: () => void }) {
  const th = OPENING_THEORY[opening.id]
  const [lineNo, setLineNo] = useState(0)
  const side: Color = opening.side
  const main = opening.lines[0].moves.split(' ')
  const line = opening.lines[lineNo]
  return (
    <Shell title={opening.name} onClose={onClose} action={onPractice ? { label: t('Jetzt üben'), onClick: onPractice } : undefined}>
      <div className="tp-hero">
        <Diagram moves={main.slice(0, th.heroPly).join(' ')} orientation={side} />
        <div className="tp-hero-text">
          <span className="tp-kicker">{side === 'w' ? t('Du spielst Weiß') : t('Du spielst Schwarz')}</span>
          <span className="tp-first">{opening.first}</span>
          <p className="tp-lead">{opening.summary}</p>
        </div>
      </div>

      <Section title={t('Die Grundideen')}><List items={opening.ideas} /></Section>

      <Section title={t('Zug für Zug')}>
        <p>{t('Klicke dich durch die Varianten. Zu jedem Zug steht, warum er gespielt wird.')}</p>
        {opening.lines.length > 1 && (
          <div className="tp-tabs" role="tablist">
            {opening.lines.map((l, i) => <button key={l.name} role="tab" aria-selected={i === lineNo} className={i === lineNo ? 'active' : ''} onClick={() => setLineNo(i)}>{l.name}</button>)}
          </div>
        )}
        <p className="tp-idea">{th.lineIdeas[lineNo]}</p>
        <LineViewer key={lineNo} moves={line.moves.split(' ')} notes={th.notes[lineNo]} orientation={side} />
      </Section>

      <Section title={t('Bauernstruktur und Pläne')}>
        <Diagram moves={main.join(' ')} orientation={side} caption={t('Nach der Hauptvariante ({name})', { name: opening.lines[0].name })} />
        <p>{th.structure}</p>
        <h3>{t('Deine Pläne nach der Eröffnung')}</h3>
        <List items={th.plans} />
      </Section>

      <Section title={t('Worauf du achten musst')}><List items={th.watch} /></Section>

      <Section title={t('Wenn der Gegner anders spielt')}>
        <p>{t('Der Gegner hält sich nicht immer an die Varianten. Hier die häufigsten Abweichungen. Der grüne Pfeil zeigt deine Antwort.')}</p>
        <div className="tp-cards">
          {th.deviations.map((d) => {
            const before = d.after.split(' ').filter(Boolean)
            const after = [...before, d.move]
            return (
              <div key={d.after + d.move} className="tp-card">
                <Diagram moves={after.join(' ')} orientation={side} arrows={arrowFor(after, d.answer)} small />
                <div className="tp-card-text">
                  <span className="tp-moves">{moveText(after)}</span>
                  <span className="tp-answer">{t('Spiele {move}', { move: moveText([d.answer], after.length) })}</span>
                  <p>{d.why}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title={t('Fallen und typische Fehler')}>
        {th.trapBoards?.length ? (
          <div className="tp-cards">
            {th.trapBoards.map((b) => (
              <div key={b.moves} className="tp-card">
                <Diagram moves={b.moves} orientation={side} small />
                <div className="tp-card-text">
                  <span className="tp-moves">{moveText(b.moves.split(' '))}</span>
                  <p>{b.caption}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {th.traps.length > 0 && <List items={th.traps} />}
      </Section>
    </Shell>
  )
}

export function EndgameTheoryPage({ endgame, onClose, onPractice }: { endgame: Endgame; onClose: () => void; onPractice?: () => void }) {
  const th = ENDGAME_THEORY[endgame.id]
  const me = endgame.fen.split(' ')[1] as Color
  return (
    <Shell title={endgame.name} onClose={onClose} action={onPractice ? { label: t('Jetzt üben'), onClick: onPractice } : undefined}>
      <div className="tp-hero">
        <Diagram fen={endgame.fen} orientation={me} caption={t('Die Übungsstellung')} />
        <div className="tp-hero-text">
          <span className="tp-kicker">{me === 'w' ? t('Du spielst Weiß') : t('Du spielst Schwarz')}</span>
          <p className="tp-lead">{endgame.task}</p>
        </div>
      </div>
      <Section title={t('Die Idee')}><p>{th?.idea ?? endgame.tip}</p></Section>
      {th && <Section title={t('So gehst du vor')}><List items={th.steps} numbered /></Section>}
      {th && <Section title={t('Typische Fehler')}><List items={th.mistakes} /></Section>}
      {endgame.stars && (
        <Section title={t('Sterne')}>
          <p>{t('3 Sterne: höchstens {a} Züge. 2 Sterne: höchstens {b} Züge. Jeder Tipp kostet einen Stern.', { a: endgame.stars[0], b: endgame.stars[1] })}</p>
        </Section>
      )}
    </Shell>
  )
}

// an easy puzzle of the motif as example: position after the opponent's move, arrow on the solution
function useExample(theme: string) {
  const [ex, setEx] = useState<{ fen: string; from: string; to: string; side: Color } | null>(null)
  useEffect(() => {
    let alive = true
    loadPuzzles().then((list) => {
      const p = list.filter((x: Puzzle) => hasTheme(x, theme) && x.rating >= 600).sort((a, b) => a.rating - b.rating)[0]
      if (!p || !alive) return
      const [first, sol] = p.moves.split(' ')
      const c = new Chess(p.fen)
      c.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first[4] })
      setEx({ fen: c.fen(), from: sol.slice(0, 2), to: sol.slice(2, 4), side: c.turn() })
    }).catch(() => { /* no example */ })
    return () => { alive = false }
  }, [theme])
  return ex
}

export function MotifTheoryPage({ theme, onClose, onPractice }: { theme: string; onClose: () => void; onPractice?: () => void }) {
  const motif = MOTIFS.find((m) => m.theme === theme)
  const th = MOTIF_THEORY[theme]
  const ex = useExample(theme)
  return (
    <Shell title={motif?.name ?? t('Motiv')} onClose={onClose} action={onPractice ? { label: t('Jetzt üben'), onClick: onPractice } : undefined}>
      <p className="tp-lead">{th?.what}</p>
      <Section title={t('Ein Beispiel')}>
        {ex
          ? <Diagram fen={ex.fen} orientation={ex.side} arrows={[{ from: ex.from, to: ex.to }]} caption={ex.side === 'w' ? t('Weiß am Zug. Der Pfeil zeigt den ersten Zug der Lösung.') : t('Schwarz am Zug. Der Pfeil zeigt den ersten Zug der Lösung.')} />
          : <p className="tp-muted">{t('Beispiel wird geladen…')}</p>}
      </Section>
      {th && <Section title={t('So erkennst du es')}><List items={th.spot} /></Section>}
    </Shell>
  )
}
