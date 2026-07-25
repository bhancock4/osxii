import { usePopups } from '../state/popups'

export default function Toasts() {
  const toasts = usePopups(s => s.toasts)
  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.text}</div>
      ))}
    </div>
  )
}
