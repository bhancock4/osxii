import { useEffect, useState } from 'react'
import { DIFFICULTIES, type Difficulty } from '../chaos/difficulty'
import {
  leaderboardEnabled, savedName, rememberName,
  submitScore, fetchTop, fetchRank,
  type Ending, type ScoreEntry,
} from './client'

function fmtTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/**
 * Post-game leaderboard: submit a name (optional — glory is opt-in), then see
 * the top 10 for this edition + ending, with your rank highlighted.
 */
export default function Leaderboard({ entry }: { entry: Omit<ScoreEntry, 'name'> }) {
  const [name, setName] = useState(savedName())
  const [phase, setPhase] = useState<'form' | 'submitting' | 'done' | 'error'>('form')
  const [rank, setRank] = useState<number | null>(null)
  const [myId, setMyId] = useState<number | null>(null)
  const [top, setTop] = useState<ScoreEntry[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  const board = { difficulty: entry.difficulty as Difficulty, ending: entry.ending as Ending }

  const loadTop = () => {
    fetchTop(board.difficulty, board.ending)
      .then(setTop)
      .catch(() => setLoadError(true))
  }

  useEffect(loadTop, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!leaderboardEnabled()) return null

  const submit = async () => {
    const trimmed = name.trim().slice(0, 24)
    if (!trimmed) return
    rememberName(trimmed)
    setPhase('submitting')
    try {
      const { id } = await submitScore({ ...entry, name: trimmed })
      setMyId(id)
      setRank(await fetchRank({ ...entry, name: trimmed }))
      setPhase('done')
      loadTop()
    } catch {
      setPhase('error')
    }
  }

  return (
    <div className="leaderboard">
      <div className="lb-title">
        🌐 Global Hall of {entry.ending === 'ultrawon' ? 'Liberation' : 'Suffering'} — {DIFFICULTIES[board.difficulty].label}
      </div>

      {phase === 'form' && (
        <div className="lb-form">
          <input
            maxLength={24}
            placeholder="valued_customer"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          <button disabled={!name.trim()} onClick={submit}>Immortalize Me</button>
        </div>
      )}
      {phase === 'submitting' && <p className="lb-note">Uploading your suffering…</p>}
      {phase === 'done' && rank !== null && (
        <p className="lb-note lb-rank">
          You are #{rank} {entry.ending === 'ultrawon' ? 'fastest to freedom' : 'worldwide'}.
          {rank === 1 ? ' Legally, this makes you employee of the month.' : ''}
        </p>
      )}
      {phase === 'error' && (
        <p className="lb-note">Score upload failed. The cloud is experiencing feelings. <button className="lb-retry" onClick={() => setPhase('form')}>Retry</button></p>
      )}

      {loadError && <p className="lb-note">Leaderboard unavailable. Imagine you are #1.</p>}
      {top && top.length > 0 && (
        <table className="lb-table">
          <thead>
            <tr><th>#</th><th>Name</th>{entry.ending === 'ultrawon' ? <th>Time</th> : <><th>Score</th><th>Time</th></>}</tr>
          </thead>
          <tbody>
            {top.map((row, i) => (
              <tr key={row.id} className={row.id === myId ? 'lb-me' : ''}>
                <td>{i + 1}</td>
                <td>{row.name}</td>
                {entry.ending === 'ultrawon'
                  ? <td>{fmtTime(row.seconds)}</td>
                  : <><td>{row.score.toLocaleString()}</td><td>{fmtTime(row.seconds)}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {top && top.length === 0 && !loadError && (
        <p className="lb-note">No survivors yet on this board. Be the first.</p>
      )}
    </div>
  )
}
