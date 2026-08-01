import { useGame } from '../state/game'
import Leaderboard from '../leaderboard/Leaderboard'

export default function UltimateScreen() {
  const { startedAt, wonAt, stats, subscriptions, balance, difficulty } = useGame()
  const seconds = Math.round(((wonAt ?? Date.now()) - startedAt) / 1000)

  return (
    <div className="fullscreen ultimate-screen">
      <div className="ultimate-body">
        <div className="ultimate-scroll">
          <p>FORMAT C: /FINAL /NO_REGRETS</p>
          <p>Deleting ads… done.</p>
          <p>Deleting subscriptions… done. ({subscriptions.length} screamed.)</p>
          <p>Deleting SmartAssist™… it thanked us.</p>
          <p>Deleting OSXii… </p>
          <p className="ultimate-done">0 bytes of operating system remain.</p>
        </div>
        <h1 className="ultimate-title">🏆 TOTAL SYSTEM LIBERATION 🏆</h1>
        <p className="ultimate-sub">
          You didn't beat OSXii. You <i>freed yourself from it</i>. The lawyers said
          this ending was "technically permissible," and here you are.
        </p>
        <table className="victory-stats ultimate-stats">
          <tbody>
            <tr><td>Time to enlightenment</td><td>{Math.floor(seconds / 60)}m {seconds % 60}s</td></tr>
            <tr><td>Ads defeated</td><td>{stats.adsClosed}</td></tr>
            <tr><td>Errors accepted</td><td>{stats.errorsSeen}</td></tr>
            <tr><td>Files that mattered</td><td>0</td></tr>
          </tbody>
        </table>
        <h2 className="ultimate-score">SCORE: ∞</h2>
        <p className="ultimate-small">This is the true ending. There is no achievement. The peace is the achievement.</p>
        <Leaderboard
          entry={{
            difficulty,
            ending: 'ultrawon',
            score: 0,
            seconds,
            balance,
            subs: subscriptions.length,
            ads_closed: stats.adsClosed,
          }}
        />
        <button className="victory-btn" onClick={() => window.location.reload()}>
          Reinstall OSXii (why)
        </button>
      </div>
    </div>
  )
}
