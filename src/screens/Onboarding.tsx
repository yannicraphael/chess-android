import { useState } from 'react'
import Icon, { type IconName } from '../components/Icon'
import { puzzleStats } from '../lib/puzzles'
import { setStartRating } from '../lib/rating'
import { pieceUrl, settings } from '../lib/settings'
import './Onboarding.css'

const LEVELS: { r: number; title: string; sub: string }[] = [
  { r: 400, title: 'Ich lerne gerade die Regeln', sub: 'Wie die Figuren ziehen, weiß ich schon.' },
  { r: 800, title: 'Ich spiele ab und zu', sub: 'Gegen Freunde oder online, ohne Training.' },
  { r: 1200, title: 'Ich spiele regelmäßig', sub: 'Ich kenne Eröffnungen und Taktiken.' },
  { r: 1600, title: 'Ich spiele Turniere', sub: 'Im Verein oder mit Wertungszahl.' },
]

const TOUR: { icon: IconName; title: string; text: string }[] = [
  { icon: 'play', title: 'Spielen', text: '87 Gegner von 100 bis 2850 und eine Engine bis 3200. Gewertete Partien ohne Hilfen bestimmen deine Wertung.' },
  { icon: 'puzzle', title: 'Taktik', text: 'Aufgaben passend zu deiner Stärke, Motive mit Leveln und deine eigenen Fehler als Übungen.' },
  { icon: 'learn', title: 'Lernen', text: 'Kurze Lektionen, zehn Eröffnungen zum Üben und die wichtigsten Endspiele gegen die Engine.' },
]

// First start: name, playing strength (sets the starting ratings) and a short tour.
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const s = settings.use()
  const [step, setStep] = useState(0)
  const [level, setLevel] = useState<number | null>(null)

  function finish() {
    if (level !== null) {
      setStartRating(level)
      const ps = puzzleStats.get()
      if (ps.played === 0) puzzleStats.set({ rating: level, peak: level })
    }
    settings.set({ onboarded: true })
    onDone()
  }

  return (
    <div className="onboarding">
      <div className="ob-dots">{[0, 1, 2].map((i) => <span key={i} className={i === step ? 'on' : ''} />)}</div>

      {step === 0 && (
        <div className="ob-step">
          <div className="ob-hero">
            <img src={pieceUrl('w', 'n')} alt="" />
            <img src={pieceUrl('b', 'k')} alt="" />
          </div>
          <h1>Willkommen!</h1>
          <p>Deine persönliche Schachschule: spielen, trainieren, besser werden. Komplett offline.</p>
          <label className="ob-label" htmlFor="ob-name">Wie heißt du?</label>
          <input id="ob-name" className="name-input" value={s.name} maxLength={20} onChange={(e) => settings.set({ name: e.target.value })} />
          <button className="btn primary big" onClick={() => setStep(1)}>Weiter</button>
        </div>
      )}

      {step === 1 && (
        <div className="ob-step">
          <h1>Wie stark spielst du?</h1>
          <p>Damit starten deine Wertung und die Aufgaben auf dem richtigen Niveau. Danach passt sich alles automatisch an.</p>
          <div className="ob-levels">
            {LEVELS.map((l) => (
              <button key={l.r} className={'ob-level' + (level === l.r ? ' active' : '')} onClick={() => setLevel(l.r)}>
                <strong>{l.title}</strong>
                <small>{l.sub}</small>
                <span className="ob-r">{l.r}</span>
              </button>
            ))}
          </div>
          <button className="btn primary big" disabled={level === null} onClick={() => setStep(2)}>Weiter</button>
        </div>
      )}

      {step === 2 && (
        <div className="ob-step">
          <h1>So funktioniert’s</h1>
          <div className="ob-tour">
            {TOUR.map((t) => (
              <div key={t.title} className="ob-tour-row">
                <span className="ob-tour-icon"><Icon name={t.icon} /></span>
                <span><strong>{t.title}</strong><small>{t.text}</small></span>
              </div>
            ))}
          </div>
          <button className="btn primary big" onClick={finish}>Los geht’s</button>
        </div>
      )}
    </div>
  )
}
