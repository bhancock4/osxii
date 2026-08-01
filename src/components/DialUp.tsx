import { useEffect, useRef, useState } from 'react'
import { config } from '../state/game'
import { chance } from '../chaos/engine'

const STEPS = [
  'Dialing 1-800-OSXII-DRM…',
  '♪ beep boop bee-doo beeeeep ♪',
  'kshhhhhhh-EEEEE-awww-kshhhhh (the modem is singing)',
  'Handshaking… (the modem is nervous)',
  'Verifying DRM entitlement for: TEXT FILES…',
  'Connected at 2.4 kbps. Do not breathe near the phone line.',
]

/** Step index where a LINE BUSY failure can strike. */
const FAIL_STEP = 3
const STEP_MS = 1500

/**
 * Saving a document requires an internet connection, for DRM purposes.
 * The internet, however, is from 1997.
 */
export default function DialUp({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [lines, setLines] = useState<string[]>([])
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(1)
  // Only the first handshake may fail — retries always connect, so the save
  // is delayed, never denied.
  const mayFail = useRef(chance(config().dialUpFailChance))

  useEffect(() => {
    setLines([])
    setFailed(false)
    let step = 0
    const id = setInterval(() => {
      if (step === FAIL_STEP && attempt === 1 && mayFail.current) {
        clearInterval(id)
        setLines(l => [...l, 'LINE BUSY. Your neighbor is using the internet.'])
        setFailed(true)
        return
      }
      setLines(l => [...l, STEPS[step]])
      step++
      if (step >= STEPS.length) {
        clearInterval(id)
        setTimeout(onDone, 900)
      }
    }, STEP_MS)
    return () => clearInterval(id)
  }, [attempt, onDone])

  const pct = Math.min(100, Math.round((lines.length / STEPS.length) * 100))

  return (
    <div className="save-dialog window dialup">
      <div className="title-bar">
        <div className="title-bar-text">OSXii Dial-Up Networking — DRM Verification Required</div>
      </div>
      <div className="window-body dialup-body">
        <div className="dialup-art">☎️ ⇄ 🖥️</div>
        <p className="dialup-why">
          Saving documents requires an active internet connection to verify your
          license to use letters.
        </p>
        <div className="dialup-log">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {lines.length === 0 && <div>Picking up the phone…</div>}
        </div>
        <div className="boot-bar dialup-bar">
          <div className="boot-bar-fill" style={{ width: `${failed ? 42 : pct}%` }} />
        </div>
        <div className="save-actions">
          {failed && <button onClick={() => setAttempt(a => a + 1)}>Redial</button>}
          <button onClick={onCancel}>Cancel (abandon save)</button>
        </div>
      </div>
    </div>
  )
}
