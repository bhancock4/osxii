import { usePopups } from '../state/popups'
import { useGame } from '../state/game'

export default function Bindows() {
  const tip = usePopups(s => s.bindowsTip)
  const hide = usePopups(s => s.hideBindows)
  const module = useGame(s => s.module)
  if (!tip) return null
  return (
    <div className="bindows">
      {/* In StrategyLens the paperclip is replaced by Chrono™, a stopwatch with opinions. */}
      <div className="bindows-clip">{module === 'strategylens' ? '⏱️' : '📎'}</div>
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
