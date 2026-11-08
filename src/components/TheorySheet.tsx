import { t } from '../i18n'
import type { ReactNode } from 'react'
import { useBack } from '../lib/back'
import './TheorySheet.css'

export interface TheoryBlock {
  title: string
  text?: string
  items?: ReactNode[]
  numbered?: boolean
}

// A scrollable sheet with theory: title, short intro and sections of text or lists.
export default function TheorySheet({ title, subtitle, intro, blocks, button = t('Weiter'), onClose }: {
  title: string
  subtitle?: string
  intro?: string
  blocks: TheoryBlock[]
  button?: string
  onClose: () => void
}) {
  useBack(() => { onClose(); return true }, true)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal theory-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="ts-scroll">
          <h2>{title}</h2>
          {subtitle && <p className="ts-sub">{subtitle}</p>}
          {intro && <p className="ts-intro">{intro}</p>}
          {blocks.filter((b) => b.text || b.items?.length).map((b) => (
            <section key={b.title} className="ts-block">
              <h3>{b.title}</h3>
              {b.text && <p>{b.text}</p>}
              {b.items && (b.numbered
                ? <ol>{b.items.map((it, i) => <li key={i}>{it}</li>)}</ol>
                : <ul>{b.items.map((it, i) => <li key={i}>{it}</li>)}</ul>)}
            </section>
          ))}
        </div>
        <div className="modal-buttons">
          <button className="btn primary" onClick={onClose}>{button}</button>
        </div>
      </div>
    </div>
  )
}
