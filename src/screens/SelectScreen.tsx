import { useGame } from '../state/game'
import { DIFFICULTIES } from '../chaos/difficulty'

export default function SelectScreen() {
  const start = useGame(s => s.start)

  return (
    <div className="fullscreen select-screen">
      <div className="select-card window">
        <div className="title-bar">
          <div className="title-bar-text">OSXii Setup — Choose Your Edition</div>
        </div>
        <div className="window-body select-body">
          <p className="select-lede">
            Every copy of OSXii is licensed per level of suffering. Choose wisely; you
            cannot afford any of them.
          </p>
          {Object.values(DIFFICULTIES).map(d => (
            <button key={d.key} className="select-option" onClick={() => start(d.key)}>
              <span className="select-icon">{d.icon}</span>
              <span className="select-text">
                <b>{d.label}</b>
                <small>{d.blurb}</small>
              </span>
              <span className="select-install">Install ▸</span>
            </button>
          ))}
          <p className="select-footer">All editions cost the same: everything.</p>
        </div>
      </div>
    </div>
  )
}
