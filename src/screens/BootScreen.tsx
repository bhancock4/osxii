import { useEffect, useState } from 'react'
import { useGame } from '../state/game'

const STAGES = [
  'Starting Wondows12…',
  'Loading personalized ads…',
  'Monetizing boot sector…',
  'Almost definitely almost done…',
]

export default function BootScreen() {
  const boot = useGame(s => s.boot)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setPct(p => {
        if (p >= 100) return p
        if (p >= 90 && p < 99) return p + 1 // dramatic stall
        return Math.min(100, p + Math.floor(8 + Math.random() * 14))
      })
    }, 180)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (pct >= 100) {
      const id = setTimeout(boot, 400)
      return () => clearTimeout(id)
    }
  }, [pct, boot])

  return (
    <div className="fullscreen boot-screen">
      <div>
        <h1 className="boot-logo">🪟 Wondows<span className="boot-12">12</span></h1>
        <p className="boot-tagline">Where do you want to be advertised to today?</p>
        <div className="boot-bar">
          <div className="boot-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="boot-stage">{STAGES[Math.min(STAGES.length - 1, Math.floor(pct / 26))]}</p>
        <p className="boot-small">Press any key to skip (this does nothing)</p>
      </div>
    </div>
  )
}
