import { useEffect, useMemo, useRef, useState } from 'react'
import { useTimesheet, rowTotal, weekTotal, emptyWeek, DAY_LABELS, EDITABLE_DAYS } from '../state/timesheet'
import { usePopups } from '../state/popups'
import { SL } from '../chaos/difficulty'
import { chance } from '../chaos/engine'
import {
  SL_ITEM_BY_ID, SELECT_WORK_TREE, SEARCH_RESPONSES, LOADING_LINES, SL_ERRORS,
  type SLTreeNode,
} from '../content/strategylens'

const rand = (min: number, max: number) => min + Math.random() * (max - min)

// ---------------------------------------------------------------------------
// A grid cell that takes its time. Commits on blur/Enter after a "validation"
// delay; occasionally rejects a perfectly legal number out of principle.
// ---------------------------------------------------------------------------

function LagCell({ itemId, day }: { itemId: string; day: number }) {
  const value = useTimesheet(s => (s.entries[itemId] ?? emptyWeek())[day])
  const setCell = useTimesheet(s => s.setCell)
  const [text, setText] = useState(value > 0 ? String(value) : '')
  const [pending, setPending] = useState(false)
  const focused = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The server occasionally "restores" cells; reflect store changes unless the
  // player is mid-edit.
  useEffect(() => {
    if (!focused.current && !pending) setText(value > 0 ? String(value) : '')
  }, [value, pending])

  const commit = () => {
    focused.current = false
    const parsed = parseFloat(text)
    const hours = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
    if (hours === value && !(text !== '' && hours === 0)) return
    setPending(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setPending(false)
      if (hours > 0 && chance(SL.cellRejectChance)) {
        usePopups.getState().spawnError(SL_ERRORS[Math.floor(Math.random() * 3)])
        setText(value > 0 ? String(value) : '')
        return
      }
      setCell(itemId, day, hours)
      setText(hours > 0 ? String(hours) : '')
    }, rand(SL.cellLagMs[0], SL.cellLagMs[1]))
  }

  return (
    <input
      className={'sl-cell' + (pending ? ' sl-cell-pending' : '')}
      value={pending ? '…' : text}
      disabled={pending}
      inputMode="decimal"
      aria-label={`${SL_ITEM_BY_ID[itemId].code} ${DAY_LABELS[day]}`}
      onFocus={() => { focused.current = true }}
      onChange={e => setText(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
    />
  )
}

// ---------------------------------------------------------------------------
// Select Work: the hierarchy. It is intuitive.
// ---------------------------------------------------------------------------

function TreeNode({ node, depth }: { node: SLTreeNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0)
  const onCard = useTimesheet(s => s.onCard)
  const entries = useTimesheet(s => s.entries)
  const addToCard = useTimesheet(s => s.addToCard)

  if (node.itemId) {
    const item = SL_ITEM_BY_ID[node.itemId]
    const checked = onCard.includes(node.itemId)
    const hasHours = checked && rowTotal(entries, node.itemId) > 0
    const disabled = item.treeDisabled || hasHours
    return (
      <label
        className={'sl-tree-leaf' + (item.treeDisabled ? ' sl-tree-disabled' : '')}
        style={{ paddingLeft: 14 + depth * 16 }}
        title={item.treeDisabled ? 'This item cannot be selected. No further information is available.'
          : hasHours ? 'This line contains time and can never be removed. Time is like that.' : undefined}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => { if (!checked) addToCard(node.itemId!) }}
        />
        <span>{node.label}</span>
      </label>
    )
  }

  const isEmpty = node.empty || !node.children || node.children.length === 0
  return (
    <div>
      <button className="sl-tree-branch" style={{ paddingLeft: 4 + depth * 16 }} onClick={() => setOpen(o => !o)}>
        <span className="sl-tree-caret">{open ? '▾' : '▸'}</span> {node.label}
      </button>
      {open && (
        isEmpty
          ? <div className="sl-tree-empty" style={{ paddingLeft: 30 + depth * 16 }}>(0 items)</div>
          : node.children!.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} />)
      )}
    </div>
  )
}

function SelectWork({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [searchMsg, setSearchMsg] = useState<string | null>(null)

  const search = () => {
    if (!query.trim()) return
    const respond = SEARCH_RESPONSES[Math.floor(Math.random() * SEARCH_RESPONSES.length)]
    setSearchMsg(respond(query.trim()))
  }

  return (
    <div className="sl-modal">
      <div className="sl-modal-box">
        <div className="sl-modal-title">Select Work — Enterprise Work Structure (partial) (authoritative)</div>
        <div className="sl-search-row">
          <input
            className="sl-search"
            placeholder="Search work items…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button onClick={search}>Search</button>
        </div>
        {searchMsg && <div className="sl-search-msg">{searchMsg}</div>}
        <div className="sl-tree">
          {SELECT_WORK_TREE.map((n, i) => <TreeNode key={i} node={n} depth={0} />)}
        </div>
        <div className="sl-modal-actions">
          <span className="sl-modal-hint">Checked items are added to your timecard. Unchecking is a request, not a feature.</span>
          <button className="sl-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The footer. It lies.
// ---------------------------------------------------------------------------

function AutosaveLie() {
  const [flicker, setFlicker] = useState(false)
  useEffect(() => {
    const id = setInterval(() => {
      if (chance(0.08)) {
        setFlicker(true)
        setTimeout(() => setFlicker(false), 700)
      }
    }, 4000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className={'sl-autosave' + (flicker ? ' sl-autosave-doubt' : '')}>
      {flicker ? 'Some changes may not have been saved' : 'All changes have been saved ✓'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// The application
// ---------------------------------------------------------------------------

export default function StrategyLens() {
  const onCard = useTimesheet(s => s.onCard)
  const entries = useTimesheet(s => s.entries)
  const hidden = useTimesheet(s => s.hidden)
  const valError = useTimesheet(s => s.valError)
  const clearValError = useTimesheet(s => s.clearValError)
  const trySubmit = useTimesheet(s => s.trySubmit)
  const playerName = useTimesheet(s => s.playerName)
  const submitted = useTimesheet(s => s.submitted)
  const toast = usePopups(s => s.toast)

  const [loading, setLoading] = useState(true)
  const [loadLine, setLoadLine] = useState(LOADING_LINES[0])
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    const total = rand(SL.loadMs[0], SL.loadMs[1])
    const lineId = setInterval(() => setLoadLine(LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)]), 800)
    const doneId = setTimeout(() => { clearInterval(lineId); setLoading(false) }, total)
    return () => { clearInterval(lineId); clearTimeout(doneId) }
  }, [])

  const groups = useMemo(() => {
    const out: { group: string; ids: string[] }[] = []
    for (const id of onCard) {
      const g = SL_ITEM_BY_ID[id].group
      const last = out[out.length - 1]
      if (last && last.group === g) last.ids.push(id)
      else out.push({ group: g, ids: [id] })
    }
    return out
  }, [onCard])

  if (loading) {
    return (
      <div className="sl-app sl-loading">
        <div className="sl-load-logo">▽ StrategyLens<sup>®</sup></div>
        <div className="sl-load-bar"><div className="sl-load-bar-fill" /></div>
        <div className="sl-load-line">{loadLine}</div>
        <div className="sl-load-small">part of the ClarityOne™ Suite</div>
      </div>
    )
  }

  const total = weekTotal(entries)
  const dayTotals = [0, 1, 2, 3, 4, 5, 6].map(d =>
    onCard.reduce((s, id) => s + ((entries[id] ?? emptyWeek())[d] ?? 0), 0))

  return (
    <div className="sl-app">
      {!hidden.toolbar ? (
        <div className="sl-toolbar">
          <span className="sl-logo">▽ StrategyLens<sup>®</sup></span>
          <span className="sl-crumb">Resource: {playerName || '???'} › Timesheet › This Week (Final)</span>
          <span className="sl-week-nav">
            <button onClick={() => toast('◀ Other weeks are read-only during cutoff. All weeks are during cutoff.')}>‹</button>
            <b>This Week</b>
            <button onClick={() => toast('▶ Future time cannot be entered. See Chrono™ guidance on fraud.')}>›</button>
          </span>
        </div>
      ) : <div className="sl-toolbar sl-gone">&nbsp;</div>}

      {valError && (
        <div className="sl-valerror" role="alert">
          <span>⛔ {valError}</span>
          <button onClick={clearValError}>Dismiss</button>
        </div>
      )}

      {hidden.grid ? (
        <div className="sl-grid-gone">
          <div className="sl-grid-gone-msg">The grid is being recalculated.<br />Do not perceive the grid.</div>
        </div>
      ) : (
        <div className="sl-grid-wrap">
          <table className="sl-grid">
            <thead>
              <tr>
                <th className="sl-work-col">Work</th>
                {DAY_LABELS.map((d, i) => (
                  <th key={d} className={i === 0 || i === 6 ? 'sl-weekend' : ''}>
                    {hidden.colFri && i === 5 ? ' ' : d}
                  </th>
                ))}
                {!hidden.total && <th>Total</th>}
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                [
                  <tr key={g.group} className="sl-group-row"><td colSpan={hidden.total ? 9 : 10}>{g.group}</td></tr>,
                  ...g.ids.map(id => {
                    const item = SL_ITEM_BY_ID[id]
                    const rt = rowTotal(entries, id)
                    const remaining = item.remaining === null ? null : item.remaining - rt
                    return (
                      <tr key={id}>
                        <td className="sl-work-col">
                          <span className="sl-item-pin">{item.kind === 'bucket' ? '📌' : '☆'}</span>
                          {item.code} · {item.label}
                        </td>
                        {DAY_LABELS.map((_, day) => (
                          <td key={day} className={day === 0 || day === 6 ? 'sl-weekend' : ''}>
                            {day === 0 || day === 6 ? (
                              <input className="sl-cell" disabled title="Weekend time requires Form A_117L." />
                            ) : hidden.colFri && day === 5 ? (
                              <span className="sl-cell-gone">&nbsp;</span>
                            ) : (
                              <LagCell itemId={id} day={day} />
                            )}
                          </td>
                        ))}
                        {!hidden.total && <td className="sl-num">{rt > 0 ? rt.toFixed(2) : ''}</td>}
                        <td className={'sl-num sl-remaining' + (remaining !== null && remaining < 0 ? ' sl-over' : '')}>
                          {remaining === null ? '∞' : remaining.toFixed(2)}
                        </td>
                      </tr>
                    )
                  }),
                ]
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                {dayTotals.map((t, i) => (
                  <td key={i} className={'sl-num' + (i === 0 || i === 6 ? ' sl-weekend' : '')}>
                    {hidden.colFri && i === 5 ? '' : t > 0 ? t.toFixed(2) : '0h'}
                  </td>
                ))}
                {!hidden.total && <td className={'sl-num sl-week-total' + (Math.abs(total - SL.weekTotal) < 1e-9 ? ' sl-forty' : '')}>{total.toFixed(2)}</td>}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="sl-footer">
        {!hidden.selectwork ? (
          <button className="sl-selectwork" onClick={() => setSelecting(true)}>☑ Select Work</button>
        ) : <span className="sl-gone-btn">&nbsp;</span>}
        <AutosaveLie />
        {!hidden.submit ? (
          <button className="sl-primary sl-submit" disabled={submitted} onClick={trySubmit}>
            Sign and Submit
          </button>
        ) : <span className="sl-gone-btn">&nbsp;</span>}
      </div>

      {selecting && <SelectWork onClose={() => setSelecting(false)} />}
    </div>
  )
}
