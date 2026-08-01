import { useEffect, useState } from 'react'
import { useGame } from '../state/game'
import { usePopups } from '../state/popups'

const WRONG = [
  'Incorrect password.',
  'Still incorrect.',
  'That is also not it.',
  'Incorrect. Attempts remaining: ∞',
  'The password remains elsewhere.',
  'No. But you are building character.',
]

export default function LockScreen() {
  const unlock = useGame(s => s.unlock)
  const toast = usePopups(s => s.toast)
  const [value, setValue] = useState('')
  const [message, setMessage] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [shake, setShake] = useState(false)
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [])

  const submit = () => {
    if (value === 'password') {
      unlock()
      toast('Welcome back. Nothing happened while you were away. (Lies.)')
      return
    }
    setAttempts(a => a + 1)
    setMessage(WRONG[Math.min(attempts, WRONG.length - 1)])
    setValue('')
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  return (
    <div className="fullscreen lock-screen">
      <div className={'lock-card' + (shake ? ' lock-shake' : '')}>
        <div className="lock-time">{time}</div>
        <div className="lock-user">🔒</div>
        <h2>OSXii is locked for your security</h2>
        <p className="lock-sub">valued_customer</p>
        {/* Deliberately NOT type="password": that invites iCloud Keychain /
            password managers to offer saving whatever someone types into a
            joke lock screen. Masked with CSS instead; autofill fully opted out. */}
        <input
          type="text"
          className="lock-pass"
          placeholder="Password"
          value={value}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button onClick={submit}>Unlock</button>
        <div className="lock-msg">{message || ' '}</div>
        <button
          className="lock-forgot"
          onClick={() => toast('Password reset instructions have been faxed to your childhood home.')}
        >
          Forgot password?
        </button>
      </div>
    </div>
  )
}
