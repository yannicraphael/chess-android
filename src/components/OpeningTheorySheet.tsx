import type { Opening } from '../data/openings'
import { OPENING_THEORY } from '../data/openingTheory'
import { moveText } from '../lib/chessText'
import TheorySheet from './TheorySheet'

export default function OpeningTheorySheet({ opening, button, onClose }: { opening: Opening; button?: string; onClose: () => void }) {
  const t = OPENING_THEORY[opening.id]
  const you = opening.side === 'w' ? 'Weiß' : 'Schwarz'
  return (
    <TheorySheet
      title={opening.name}
      subtitle={`${opening.first} · du spielst ${you}`}
      intro={opening.summary}
      button={button}
      onClose={onClose}
      blocks={[
        { title: 'Die Ideen', items: opening.ideas },
        { title: 'Deine Pläne nach der Eröffnung', items: t?.plans },
        { title: 'Die Bauernstruktur', text: t?.structure },
        { title: 'Die Varianten', items: opening.lines.map((l, i) => <span key={l.name}><strong>{l.name}</strong>: {t?.lineIdeas[i]}</span>) },
        { title: 'Worauf du achten musst', items: t?.watch },
        {
          title: 'Wenn der Gegner anders spielt',
          items: t?.deviations.map((d) => {
            const before = d.after.split(' ').filter(Boolean)
            return (
              <span key={d.after + d.move} className="ts-dev">
                <span className="ts-moves">{moveText([...before, d.move])}</span>
                <span>Spiele <span className="ts-answer">{moveText([d.answer], before.length + 1)}</span></span>
                <small>{d.why}</small>
              </span>
            )
          }),
        },
        { title: 'Fallen und typische Fehler', items: t?.traps },
      ]}
    />
  )
}
