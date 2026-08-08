import { useState } from 'react'
import { useGame } from '../state/game'
import { useTimesheet } from '../state/timesheet'
import { DIFFICULTIES } from '../chaos/difficulty'
import { LeaderboardPanel } from '../leaderboard/Leaderboard'
import { sanitizeName, savedName, rememberName } from '../leaderboard/client'

type Stage = 'modules' | 'classic' | 'strategylens'

export default function SelectScreen() {
  const start = useGame(s => s.start)
  const startStrategyLens = useGame(s => s.startStrategyLens)
  const [stage, setStage] = useState<Stage>('modules')
  const [name, setName] = useState(savedName())

  const clockIn = () => {
    const n = sanitizeName(name)
    if (!n) return
    rememberName(n)
    useTimesheet.setState({ playerName: n })
    startStrategyLens()
  }

  return (
    <div className="fullscreen select-screen">
      <div className="select-layout">
      <div className="select-card window">
        <div className="title-bar">
          <div className="title-bar-text">
            {stage === 'modules' && 'OSXii Setup — Choose Your Suffering'}
            {stage === 'classic' && 'OSXii Setup — Choose Your Edition'}
            {stage === 'strategylens' && 'StrategyLens® Time Entry — Resource Onboarding'}
          </div>
        </div>
        <div className="window-body select-body">
          {stage === 'modules' && (
            <>
              <p className="select-lede">
                Two experiences are installed on this machine. Neither can be uninstalled.
              </p>
              <button className="select-option" onClick={() => setStage('classic')}>
                <span className="select-icon">💾</span>
                <span className="select-text">
                  <b>OSXii Setup</b>
                  <small>The classic. Install the OS, survive the ads, create win.txt before bankruptcy.</small>
                </span>
                <span className="select-install">Install ▸</span>
              </button>
              <button className="select-option" onClick={() => setStage('strategylens')}>
                <span className="select-icon">🗓️</span>
                <span className="select-text">
                  <b>StrategyLens® Time Entry</b>
                  <small>It's end-of-month Friday. Submit 40.00 hours by 5:00 PM. The system is here to help.</small>
                </span>
                <span className="select-install">Clock In ▸</span>
              </button>
              <p className="select-footer">All modules cost the same: everything.</p>
            </>
          )}

          {stage === 'classic' && (
            <>
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
              <button className="select-back" onClick={() => setStage('modules')}>◂ Back</button>
            </>
          )}

          {stage === 'strategylens' && (
            <>
              <p className="select-lede">
                Welcome, resource. Before you may record time, the system must know
                what to call you when it disappoints you.
              </p>
              <div className="sl-onboard">
                <label className="sl-onboard-label">
                  Resource identifier (3 characters, like the arcade, unlike the arcade in every other way):
                </label>
                <div className="lb-form">
                  <input
                    className="lb-arcade-input"
                    maxLength={3}
                    placeholder="AAA"
                    autoFocus
                    value={name}
                    onChange={e => setName(sanitizeName(e.target.value))}
                    onKeyDown={e => e.key === 'Enter' && clockIn()}
                  />
                  <button className="select-option sl-clockin" disabled={!sanitizeName(name)} onClick={clockIn}>
                    <span className="select-icon">⏰</span>
                    <span className="select-text">
                      <b>Clock In</b>
                      <small>Your day starts at 6:00 AM. The cutoff is 5:00 PM. This is plenty of time.*</small>
                    </span>
                  </button>
                </div>
                <p className="select-footer">*Statement not reviewed by anyone who has used StrategyLens.</p>
              </div>
              <button className="select-back" onClick={() => setStage('modules')}>◂ Back</button>
            </>
          )}
        </div>
      </div>
      <LeaderboardPanel />
      <a
        className="select-repo"
        href="https://github.com/bhancock4/osxii"
        target="_blank"
        rel="noreferrer"
      >
        ⭐ OSXii is open source — github.com/bhancock4/osxii (warning: the source code contains spoilers, cats)
      </a>
      </div>
    </div>
  )
}
