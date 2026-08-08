import { useGame } from '../state/game'
import { useTimesheet, fmtClock } from '../state/timesheet'
import { SL } from '../chaos/difficulty'
import { SL_WIN } from '../content/strategylens'
import Leaderboard from '../leaderboard/Leaderboard'

/**
 * StrategyLens score. Mirrored EXACTLY by the Supabase validate_score trigger
 * (ending = 'timesheet'; subs = compliance strikes, ads_closed = interruptions
 * closed). Change one, change both.
 */
export function computeSLScore(seconds: number, strikes: number, interruptions: number): number {
  return Math.max(0, Math.round(10000 - seconds * 10 - strikes * 750 + interruptions * 40))
}

export default function SLVictoryScreen() {
  const { startedAt, wonAt } = useGame()
  const { clockMin, stats, playerName } = useTimesheet()
  const seconds = Math.round(((wonAt ?? Date.now()) - startedAt) / 1000)
  const score = computeSLScore(seconds, stats.strikes, stats.interruptionsClosed)
  const minutesToSpare = SL.deadlineMin - clockMin

  return (
    <div className="fullscreen victory-screen">
      <div className="victory-card window">
        <div className="title-bar">
          <div className="title-bar-text">{SL_WIN.title}</div>
        </div>
        <div className="window-body victory-body">
          <h1>{SL_WIN.headline}</h1>
          <p>{SL_WIN.blurb}</p>
          <table className="victory-stats">
            <tbody>
              <tr><td>Submitted at</td><td>{fmtClock(clockMin)} ({minutesToSpare} in-game minute{minutesToSpare === 1 ? '' : 's'} to spare)</td></tr>
              <tr><td>Real time on the clock</td><td>{Math.floor(seconds / 60)}m {seconds % 60}s</td></tr>
              <tr><td>Compliance strikes</td><td>{stats.strikes}{stats.strikes > 0 ? ' (the CIO remembers)' : ' (the CIO has never heard of you — ideal)'}</td></tr>
              <tr><td>Interruptions survived</td><td>{stats.interruptionsClosed}</td></tr>
              <tr><td>Read receipts extracted</td><td>{stats.receiptsSent}</td></tr>
              <tr><td>Validation rejections</td><td>{stats.validationFails}</td></tr>
            </tbody>
          </table>
          <h2 className="victory-score">SCORE: {score.toLocaleString()}</h2>
          <p className="victory-small">Your 40.00 hours were approved by Deb Vance, the real one.</p>
          <Leaderboard
            entry={{
              difficulty: 'eom',
              ending: 'timesheet',
              score,
              seconds,
              balance: 0,
              subs: stats.strikes,
              ads_closed: stats.interruptionsClosed,
            }}
            presetName={playerName}
          />
          <button className="victory-btn" onClick={() => window.location.reload()}>Clock In Again</button>
        </div>
      </div>
    </div>
  )
}
