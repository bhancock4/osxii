import { useEffect, useState } from 'react'
import { useGame } from '../state/game'
import { DIFFICULTIES } from '../chaos/difficulty'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { chance } from '../chaos/engine'

function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      if (chance(0.07)) {
        setTime(['88:88', '25:61', 'TIME?', '−3:15', 'soon'][Math.floor(Math.random() * 5)])
      } else {
        const d = new Date()
        setTime(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      }
    }
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Taskbar() {
  const wins = useWins(s => s.wins)
  const focus = useWins(s => s.focus)
  const topZ = useWins(s => Math.max(0, ...s.wins.filter(w => !w.minimized).map(w => w.z)))
  const balance = useGame(s => s.balance)
  const subs = useGame(s => s.subscriptions)
  const day = useGame(s => s.day)
  const difficulty = useGame(s => s.difficulty)
  const time = useClock()
  const monthDays = DIFFICULTIES[difficulty].monthDays
  const subTotal = subs.reduce((s, sub) => s + sub.price, 0)
  // Renewal pressure: blink the calendar when Day 1 is close and money is committed
  const renewalSoon = subs.length > 0 && monthDays - day <= 6

  const onStart = () => {
    usePopups.getState().toast('The Start menu is coming in OSXiii. Subscribe for early access!')
    usePopups.getState().spawnAd()
  }

  return (
    <div className="taskbar">
      <button className="start-btn" onClick={onStart}>
        <span className="start-logo">🌀</span> Start
      </button>
      <div className="task-divider" />
      {wins.map(w => (
        <button
          key={w.id}
          className={'task-btn' + (!w.minimized && w.z === topZ ? ' task-btn-active' : '')}
          onClick={() => focus(w.id)}
        >
          {w.title}
        </button>
      ))}
      <div className="tray">
        <span title="Active subscriptions">💳 ×{subs.length}</span>
        <span
          className={renewalSoon ? 'calendar calendar-warn' : 'calendar'}
          title={
            subs.length > 0
              ? `Subscriptions renew on Day 1: -$${subTotal.toFixed(2)} (OSXii Time Compression™)`
              : 'Subscriptions renew on Day 1 of each month. You have none. Keep it that way.'
          }
        >
          📅 Day {day}/{monthDays}
        </span>
        <span className={balance < 40 ? 'balance balance-low' : 'balance'}>
          ${balance.toFixed(2)}
        </span>
        <span>{time}</span>
      </div>
    </div>
  )
}
