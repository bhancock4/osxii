import { useEffect, useState } from 'react'
import { DIFFICULTIES, type Difficulty } from '../chaos/difficulty'
import {
  leaderboardEnabled, savedName, rememberName,
  submitScore, fetchTop, fetchRank, computeMovement,
  type Ending, type ScoreEntry, type Movement,
} from './client'

function fmtTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

const EDITION_SHORT: Record<Difficulty, string> = { home: 'Home', pro: 'Pro', enterprise: 'Ent' }

function EditionCell({ d }: { d: Difficulty }) {
  return (
    <span title={DIFFICULTIES[d].label}>
      {DIFFICULTIES[d].icon} {EDITION_SHORT[d]}
    </span>
  )
}

function MovementChip({ m }: { m: Movement | undefined }) {
  if (m === undefined) return null
  if (m === 'new') return <span className="lb-move lb-move-new">new</span>
  if (m > 0) return <span className="lb-move lb-move-up">▲+{m}</span>
  if (m < 0) return <span className="lb-move lb-move-down">▼{Math.abs(m)}</span>
  return <span className="lb-move lb-move-flat">–</span>
}

export function BoardTable({
  ending, rows, movement, myId,
}: {
  ending: Ending
  rows: ScoreEntry[]
  movement: Record<number, Movement>
  myId?: number | null
}) {
  if (rows.length === 0) return <p className="lb-note">No survivors yet on this board. Be the first.</p>
  return (
    <table className="lb-table">
      <thead>
        <tr>
          <th>#</th><th></th><th>Name</th><th>Edition</th>
          {ending === 'ultrawon' ? <th>Time</th> : <><th>Score</th><th>Time</th></>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id} className={row.id === myId ? 'lb-me' : ''}>
            <td>{i + 1}</td>
            <td className="lb-move-cell"><MovementChip m={movement[row.id!]} /></td>
            <td>{row.name}</td>
            <td><EditionCell d={row.difficulty as Difficulty} /></td>
            {ending === 'ultrawon'
              ? <td>{fmtTime(row.seconds)}</td>
              : <><td>{row.score.toLocaleString()}</td><td>{fmtTime(row.seconds)}</td></>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function useBoard(ending: Ending, limit: number) {
  const [rows, setRows] = useState<ScoreEntry[] | null>(null)
  const [movement, setMovement] = useState<Record<number, Movement>>({})
  const [failed, setFailed] = useState(false)
  const load = () => {
    fetchTop(ending, limit)
      .then(r => {
        setMovement(computeMovement(ending, r))
        setRows(r)
      })
      .catch(() => setFailed(true))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps
  return { rows, movement, failed, reload: load }
}

/**
 * Post-game leaderboard: submit a name (optional — glory is opt-in), then see
 * the combined board with your row highlighted.
 */
export default function Leaderboard({ entry }: { entry: Omit<ScoreEntry, 'name'> }) {
  const [name, setName] = useState(savedName())
  const [phase, setPhase] = useState<'form' | 'submitting' | 'done' | 'error'>('form')
  const [rank, setRank] = useState<number | null>(null)
  const [myId, setMyId] = useState<number | null>(null)
  const board = useBoard(entry.ending as Ending, 10)

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
      board.reload()
    } catch {
      setPhase('error')
    }
  }

  return (
    <div className="leaderboard">
      <div className="lb-title">
        🌐 Global Hall of {entry.ending === 'ultrawon' ? 'Liberation' : 'Suffering'}
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

      {board.failed && <p className="lb-note">Leaderboard unavailable. Imagine you are #1.</p>}
      {board.rows && <BoardTable ending={entry.ending as Ending} rows={board.rows} movement={board.movement} myId={myId} />}
    </div>
  )
}

/**
 * Standalone leaderboard window for the edition-select screen: both halls,
 * front and center, so newcomers know exactly what they're up against.
 */
export function LeaderboardPanel() {
  const wins = useBoard('won', 8)
  const liberation = useBoard('ultrawon', 5)

  if (!leaderboardEnabled()) return null

  return (
    <div className="lb-panel window">
      <div className="title-bar">
        <div className="title-bar-text">leaderboard.exe — Global Standings</div>
      </div>
      <div className="window-body lb-panel-body">
        <div className="lb-title">🏆 Hall of Suffering</div>
        {wins.failed && <p className="lb-note">Unavailable. Imagine greatness.</p>}
        {!wins.rows && !wins.failed && <p className="lb-note">Consulting the cloud…</p>}
        {wins.rows && <BoardTable ending="won" rows={wins.rows} movement={wins.movement} />}

        <div className="lb-title lb-title-gap">🕊️ Hall of Liberation</div>
        <p className="lb-note lb-hint">Achieved by those who found… another way out.</p>
        {liberation.failed && <p className="lb-note">Unavailable.</p>}
        {!liberation.rows && !liberation.failed && <p className="lb-note">Consulting the cloud…</p>}
        {liberation.rows && <BoardTable ending="ultrawon" rows={liberation.rows} movement={liberation.movement} />}
      </div>
    </div>
  )
}
