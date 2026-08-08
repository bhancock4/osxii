import { useState } from 'react'
import { useTimesheet, fmtClock } from '../state/timesheet'
import { SL_EMAILS, fill } from '../content/strategylens'

type Folder = 'inbox' | 'sent' | 'archive'

/**
 * ClarityMail™: deliberately, suspiciously functional. The straight man of
 * the ClarityOne Suite — it works so that StrategyLens doesn't have to.
 */
export default function ClarityMail() {
  const inbox = useTimesheet(s => s.inbox)
  const read = useTimesheet(s => s.read)
  const markRead = useTimesheet(s => s.markRead)
  const playerName = useTimesheet(s => s.playerName)
  const [folder, setFolder] = useState<Folder>('inbox')
  const [selected, setSelected] = useState<string | null>(null)

  const unreadCount = inbox.filter(e => !read[e.id]).length
  const email = selected ? SL_EMAILS.find(e => e.id === selected) : null
  const selectedAt = selected ? inbox.find(e => e.id === selected)?.atMin : undefined

  return (
    <div className="mail-app">
      <div className="mail-folders">
        <button className={folder === 'inbox' ? 'mail-folder active' : 'mail-folder'} onClick={() => setFolder('inbox')}>
          📥 Inbox {unreadCount > 0 && <b>({unreadCount})</b>}
        </button>
        <button className={folder === 'sent' ? 'mail-folder active' : 'mail-folder'} onClick={() => setFolder('sent')}>
          📤 Sent
        </button>
        <button className={folder === 'archive' ? 'mail-folder active' : 'mail-folder'} onClick={() => setFolder('archive')}>
          🗄️ Archive
        </button>
        <div className="mail-quota">Mailbox 98% full<br /><small>Deleting is not supported.</small></div>
      </div>

      <div className="mail-main">
        {folder !== 'inbox' ? (
          <div className="mail-empty">
            {folder === 'sent'
              ? 'You have sent nothing today. Everyone has noticed.'
              : 'Archived items are stored safely in the archive, which is unavailable.'}
          </div>
        ) : (
          <>
            <div className="mail-list">
              {inbox.map(({ id, atMin }) => {
                const e = SL_EMAILS.find(m => m.id === id)!
                return (
                  <button
                    key={id}
                    className={'mail-row' + (read[id] ? '' : ' unread') + (selected === id ? ' selected' : '')}
                    onClick={() => { setSelected(id); markRead(id) }}
                  >
                    <span className="mail-from">{e.from}</span>
                    <span className="mail-subj">{fill(e.subject, playerName)}</span>
                    <span className="mail-time">{fmtClock(Math.max(0, atMin))}</span>
                  </button>
                )
              })}
            </div>
            <div className="mail-read">
              {email ? (
                <>
                  <div className="mail-head">
                    <div><b>{fill(email.subject, playerName)}</b></div>
                    <div className="mail-meta">From: {email.from} &lt;{email.fromAddr}&gt;</div>
                    <div className="mail-meta">To: {playerName || 'you'}@clarityone{email.cc ? ` · Cc: ${email.cc}` : ''}</div>
                    <div className="mail-meta">Received: {selectedAt !== undefined ? fmtClock(Math.max(0, selectedAt)) : ''}{email.receipt ? ' · 🧾 Read receipt was sent on your behalf' : ''}</div>
                  </div>
                  <pre className="mail-body">{fill(email.body, playerName)}</pre>
                </>
              ) : (
                <div className="mail-empty">Select a message. They will keep coming either way.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
