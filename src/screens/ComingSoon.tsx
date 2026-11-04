export default function ComingSoon({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <div className="coming-soon">
      <h1 className="screen-title">{title}</h1>
      <div className="cs-card">
        <div className="cs-icon">{icon}</div>
        <p className="cs-lead">Kommt in einer der nächsten Versionen.</p>
        <ul>
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </div>
    </div>
  )
}
