import { usePopups } from '../state/popups'

export default function Bindows() {
  const tip = usePopups(s => s.bindowsTip)
  const hide = usePopups(s => s.hideBindows)
  if (!tip) return null
  return (
    <div className="bindows">
      <div className="bindows-clip">📎</div>
      <div className="bubble">
        <div className="bubble-text">{tip}</div>
        <div className="bubble-actions">
          <button onClick={hide}>Thanks, very helpful</button>
          <button onClick={hide}>✕</button>
        </div>
      </div>
    </div>
  )
}
