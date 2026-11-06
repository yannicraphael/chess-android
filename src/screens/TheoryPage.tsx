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
        <button className="icon-btn" onClick={onClose} aria-label="Zurück"><Icon name="back" /></button>
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
  const t = OPENING_THEORY[opening.id]
  const [lineNo, setLineNo] = useState(0)
  const side: Color = opening.side
  const main = opening.lines[0].moves.split(' ')
  const line = opening.lines[lineNo]
  return (
    <Shell title={opening.name} onClose={onClose} action={onPractice ? { label: 'Jetzt üben', onClick: onPractice } : undefined}>
      <div className="tp-hero">
        <Diagram moves={main.slice(0, t.heroPly).join(' ')} orientation={side} />
        <div className="tp-hero-text">
          <span className="tp-kicker">Du spielst {side === 'w' ? 'Weiß' : 'Schwarz'}</span>
          <span className="tp-first">{opening.first}</span>
          <p className="tp-lead">{opening.summary}</p>
        </div>
      </div>

      <Section title="Die Grundideen"><List items={opening.ideas} /></Section>

      <Section title="Zug für Zug">
        <p>Klicke dich durch die Varianten. Zu jedem Zug steht, warum er gespielt wird.</p>
        {opening.lines.length > 1 && (
          <div className="tp-tabs" role="tablist">
            {opening.lines.map((l, i) => <button key={l.name} role="tab" aria-selected={i === lineNo} className={i === lineNo ? 'active' : ''} onClick={() => setLineNo(i)}>{l.name}</button>)}
          </div>
        )}
        <p className="tp-idea">{t.lineIdeas[lineNo]}</p>
        <LineViewer key={lineNo} moves={line.moves.split(' ')} notes={t.notes[lineNo]} orientation={side} />
      </Section>

      <Section title="Bauernstruktur und Pläne">
        <Diagram moves={main.join(' ')} orientation={side} caption={`Nach der Hauptvariante (${opening.lines[0].name})`} />
        <p>{t.structure}</p>
        <h3>Deine Pläne nach der Eröffnung</h3>
        <List items={t.plans} />
      </Section>

      <Section title="Worauf du achten musst"><List items={t.watch} /></Section>

      <Section title="Wenn der Gegner anders spielt">
        <p>Der Gegner hält sich nicht immer an die Varianten. Hier die häufigsten Abweichungen. Der grüne Pfeil zeigt deine Antwort.</p>
        <div className="tp-cards">
          {t.deviations.map((d) => {
            const before = d.after.split(' ').filter(Boolean)
            const after = [...before, d.move]
            return (
              <div key={d.after + d.move} className="tp-card">
                <Diagram moves={after.join(' ')} orientation={side} arrows={arrowFor(after, d.answer)} small />
                <div className="tp-card-text">
                  <span className="tp-moves">{moveText(after)}</span>
                  <span className="tp-answer">Spiele {moveText([d.answer], after.length)}</span>
                  <p>{d.why}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Fallen und typische Fehler">
        {t.trapBoards?.length ? (
          <div className="tp-cards">
            {t.trapBoards.map((b) => (
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
        {t.traps.length > 0 && <List items={t.traps} />}
      </Section>
    </Shell>
  )
}

export function EndgameTheoryPage({ endgame, onClose, onPractice }: { endgame: Endgame; onClose: () => void; onPractice?: () => void }) {
  const t = ENDGAME_THEORY[endgame.id]
  const me = endgame.fen.split(' ')[1] as Color
  return (
    <Shell title={endgame.name} onClose={onClose} action={onPractice ? { label: 'Jetzt üben', onClick: onPractice } : undefined}>
      <div className="tp-hero">
        <Diagram fen={endgame.fen} orientation={me} caption="Die Übungsstellung" />
        <div className="tp-hero-text">
          <span className="tp-kicker">Du spielst {me === 'w' ? 'Weiß' : 'Schwarz'}</span>
          <p className="tp-lead">{endgame.task}</p>
        </div>
      </div>
      <Section title="Die Idee"><p>{t?.idea ?? endgame.tip}</p></Section>
      {t && <Section title="So gehst du vor"><List items={t.steps} numbered /></Section>}
      {t && <Section title="Typische Fehler"><List items={t.mistakes} /></Section>}
      {endgame.stars && (
        <Section title="Sterne">
          <p>3 Sterne: höchstens {endgame.stars[0]} Züge. 2 Sterne: höchstens {endgame.stars[1]} Züge. Jeder Tipp kostet einen Stern.</p>
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
  const t = MOTIF_THEORY[theme]
  const ex = useExample(theme)
  return (
    <Shell title={motif?.name ?? 'Motiv'} onClose={onClose} action={onPractice ? { label: 'Jetzt üben', onClick: onPractice } : undefined}>
      <p className="tp-lead">{t?.what}</p>
      <Section title="Ein Beispiel">
        {ex
          ? <Diagram fen={ex.fen} orientation={ex.side} arrows={[{ from: ex.from, to: ex.to }]} caption={`${ex.side === 'w' ? 'Weiß' : 'Schwarz'} am Zug. Der Pfeil zeigt den ersten Zug der Lösung.`} />
          : <p className="tp-muted">Beispiel wird geladen…</p>}
      </Section>
      {t && <Section title="So erkennst du es"><List items={t.spot} /></Section>}
    </Shell>
  )
}
