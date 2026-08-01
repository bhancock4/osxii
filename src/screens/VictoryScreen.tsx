import { useGame } from '../state/game'
import Leaderboard from '../leaderboard/Leaderboard'

export function computeScore(seconds: number, balance: number, subs: number, adsClosed: number): number {
  return Math.max(0, Math.round(5000 - seconds * 10 + balance * 20 - subs * 300 + adsClosed * 50))
}

export default function VictoryScreen() {
  const { startedAt, wonAt, balance, subscriptions, stats, difficulty } = useGame()
  const seconds = Math.round(((wonAt ?? Date.now()) - startedAt) / 1000)
  const score = computeScore(seconds, balance, subscriptions.length, stats.adsClosed)

  return (
    <div className="fullscreen victory-screen">
      <div className="victory-card window">
        <div className="title-bar">
          <div className="title-bar-text">Congratulations.exe (Responding!)</div>
        </div>
        <div className="window-body victory-body">
          <h1>🏆 I DID IT!</h1>
          <p>You created win.txt against all odds — and several subscriptions.</p>
          <table className="victory-stats">
            <tbody>
              <tr><td>Time</td><td>{Math.floor(seconds / 60)}m {seconds % 60}s</td></tr>
              <tr><td>Balance remaining</td><td>${balance.toFixed(2)}</td></tr>
              <tr><td>Subscriptions "chosen"</td><td>{subscriptions.length}</td></tr>
              <tr><td>Ads defeated</td><td>{stats.adsClosed}</td></tr>
              <tr><td>Errors accepted</td><td>{stats.errorsSeen}</td></tr>
            </tbody>
          </table>
          <h2 className="victory-score">SCORE: {score.toLocaleString()}</h2>
          <Leaderboard
            entry={{
              difficulty,
              ending: 'won',
              score,
              seconds,
              balance,
              subs: subscriptions.length,
              ads_closed: stats.adsClosed,
            }}
          />
          <button className="victory-btn" onClick={() => window.location.reload()}>Play Again</button>
        </div>
      </div>
    </div>
  )
}
