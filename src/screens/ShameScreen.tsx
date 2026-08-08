import { useEffect, useState } from 'react'
import { useGame } from '../state/game'
import { useTimesheet } from '../state/timesheet'
import { SHAME_EMAIL, CANNED_SHAME_NAMES, fill } from '../content/strategylens'
import { leaderboardEnabled, sanitizeName, submitScore, fetchTop } from '../leaderboard/client'

/**
 * 5:00 PM came and went. This is the email. Everyone is on it.
 * The loss is submitted to the cross-player wall of shame (ending 'shamed'),
 * and the shame of strangers pads out the distribution list.
 */
export default function ShameScreen() {
  const { startedAt, wonAt } = useGame()
  const { playerName, stats } = useTimesheet()
  const me = sanitizeName(playerName) || 'YOU'
  const [others, setOthers] = useState<string[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      let names: string[] = []
      if (leaderboardEnabled()) {
        const seconds = Math.round(((wonAt ?? Date.now()) - startedAt) / 1000)
        if (sanitizeName(playerName)) {
          // Losses are published. That is the point of losses.
          await submitScore({
            name: me,
            difficulty: 'eom',
            ending: 'shamed',
            score: 0,
            seconds,
            balance: 0,
            subs: stats.strikes,
            ads_closed: stats.interruptionsClosed,
          }).catch(() => { /* even our shame infrastructure has let us down */ })
        }
        try {
          const rows = await fetchTop('shamed', 12)
          names = rows.map(r => r.name).filter(n => n !== me)
        } catch { /* the cloud declined to gossip */ }
      }
      if (names.length < 4) names = [...names, ...CANNED_SHAME_NAMES].slice(0, 9)
      if (!cancelled) setOthers(names)
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fullscreen shame-screen">
      <div className="shame-card window">
        <div className="title-bar shame-bar">
          <div className="title-bar-text">📨 ClarityMail™ — 1 New Message (High Importance) (Everyone Can See This)</div>
        </div>
        <div className="window-body shame-body">
          <div className="shame-head">
            <div><b>From:</b> {SHAME_EMAIL.from}</div>
            <div><b>To:</b> {me}</div>
            <div className="shame-cc"><b>Cc:</b> {SHAME_EMAIL.cc}</div>
            <div><b>Subject:</b> {fill(SHAME_EMAIL.subject, me)}</div>
          </div>
          <pre className="shame-text">{fill(SHAME_EMAIL.intro, me)}</pre>
          <table className="shame-table">
            <thead><tr><th>Resource</th><th>Status</th></tr></thead>
            <tbody>
              <tr className="shame-me"><td>{me}</td><td>NOT SUBMITTED (you)</td></tr>
              {(others ?? ['…']).map((n, i) => (
                <tr key={i}><td>{n}</td><td>NOT SUBMITTED</td></tr>
              ))}
            </tbody>
          </table>
          <pre className="shame-text">{fill(SHAME_EMAIL.outro, me)}</pre>
          <button className="victory-btn" onClick={() => window.location.reload()}>
            Request Extension (there are no extensions — this reloads the game)
          </button>
        </div>
      </div>
    </div>
  )
}
