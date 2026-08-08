import { useEffect, useMemo, useState } from 'react'
import { useTimesheet, fmtClock } from '../state/timesheet'
import { usePopups } from '../state/popups'
import { SL } from '../chaos/difficulty'
import { chance } from '../chaos/engine'
import { scheduleReceiptReprompt, emailById } from '../chaos/slEngine'
import {
  fill, RECEIPT_PROMPT, RECEIPT_REPROMPT,
  COMPLIANCE_TITLE, COMPLIANCE_BUTTON,
  UPDATE_OFFER, UPDATE_RUNNING_LINES,
  ATTESTATION_TEXT, MANAGER_OPTIONS, CORRECT_MANAGER, WRONG_MANAGER_MSG,
} from '../content/strategylens'

// ---------------------------------------------------------------------------
// The giant email. It is new. It is a message. It is for you.
// ---------------------------------------------------------------------------

function EmailInterrupt() {
  const interrupt = useTimesheet(s => s.interrupt)
  const playerName = useTimesheet(s => s.playerName)
  const dismissInterrupt = useTimesheet(s => s.dismissInterrupt)
  const demandReceipt = useTimesheet(s => s.demandReceipt)
  const sendReceipt = useTimesheet(s => s.sendReceipt)
  const notNow = useTimesheet(s => s.notNow)
  // Whether this particular receipt demand offers the escape that isn't one.
  const hasNotNow = useMemo(() => chance(SL.notNowChance), [interrupt?.emailId])

  if (!interrupt) return null
  const email = emailById(interrupt.emailId)

  if (interrupt.phase === 'reading') {
    return (
      <div className="sl-overlay">
        <div className="window sl-bigmail">
          <div className="title-bar">
            <div className="title-bar-text">📨 ClarityMail™ — New Message (requires attention)</div>
          </div>
          <div className="window-body sl-bigmail-body">
            <div className="sl-bigmail-head">
              <div><b>From:</b> {email.from} &lt;{email.fromAddr}&gt;</div>
              {email.cc && <div><b>Cc:</b> {email.cc}</div>}
              <div><b>Subject:</b> {fill(email.subject, playerName)}</div>
            </div>
            <pre className="sl-bigmail-text">{fill(email.body, playerName)}</pre>
            <div className="sl-bigmail-actions">
              <button
                className="sl-primary"
                onClick={() => (email.receipt ? demandReceipt() : dismissInterrupt())}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const reprompt = interrupt.phase === 'reprompt'
  return (
    <div className="sl-overlay">
      <div className="window sl-receipt">
        <div className="title-bar">
          <div className="title-bar-text">{reprompt ? 'Read Receipt (again)' : 'Read Receipt Requested'}</div>
        </div>
        <div className="window-body">
          <div className="error-row">
            <span className="error-icon">🧾</span>
            <p>{reprompt ? RECEIPT_REPROMPT : RECEIPT_PROMPT}</p>
          </div>
          <div className="error-buttons">
            <button onClick={sendReceipt}>Send</button>
            <button onClick={sendReceipt}>Send</button>
            {!reprompt && hasNotNow && (
              <button onClick={() => { notNow(); scheduleReceiptReprompt(interrupt.emailId) }}>Not Now</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compliance: the manager and the CIO have been notified. So has the log.
// ---------------------------------------------------------------------------

function ComplianceAlert() {
  const compliance = useTimesheet(s => s.compliance)
  const closeCompliance = useTimesheet(s => s.closeCompliance)
  if (!compliance) return null
  return (
    <div className="sl-overlay sl-overlay-red">
      <div className="window sl-compliance">
        <div className="title-bar sl-compliance-bar">
          <div className="title-bar-text">{COMPLIANCE_TITLE}</div>
        </div>
        <div className="window-body">
          <pre className="sl-compliance-text">{compliance.body}</pre>
          <div className="error-buttons">
            <button className="sl-compliance-btn" onClick={closeCompliance}>{COMPLIANCE_BUTTON}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The 4:15. The dialog is vague. The consequences are not.
// ---------------------------------------------------------------------------

function UpdateOffer() {
  const visible = useTimesheet(s => s.updateOfferVisible)
  const clockMin = useTimesheet(s => s.clockMin)
  const answerUpdate = useTimesheet(s => s.answerUpdate)
  const toast = usePopups(s => s.toast)
  if (!visible) return null
  const answer = (deferred: boolean) => {
    answerUpdate(deferred)
    toast(deferred ? UPDATE_OFFER.laterToast : UPDATE_OFFER.okToast)
  }
  const okBtn = <button key="ok" onClick={() => answer(false)}>{UPDATE_OFFER.ok}</button>
  const laterBtn = <button key="later" data-safe="true" onClick={() => answer(true)}>{UPDATE_OFFER.later}</button>
  // OK and Later swap sides depending on the minute you were asked. Fair.
  const swapped = clockMin % 2 === 1
  return (
    <div className="sl-overlay">
      <div className="window error-dialog">
        <div className="title-bar">
          <div className="title-bar-text">{UPDATE_OFFER.title}</div>
        </div>
        <div className="window-body">
          <div className="error-row">
            <span className="error-icon">🌀</span>
            <p>{UPDATE_OFFER.body}</p>
          </div>
          <div className="error-buttons confirm-buttons">
            {swapped ? [laterBtn, okBtn] : [okBtn, laterBtn]}
          </div>
        </div>
      </div>
    </div>
  )
}

function SerenityUpdate() {
  const running = useTimesheet(s => s.updateRunning)
  const clockMin = useTimesheet(s => s.clockMin)
  const [pct, setPct] = useState(4)
  const [line, setLine] = useState(UPDATE_RUNNING_LINES[0])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setPct(p => (p >= 97 ? 31 : p + Math.floor(Math.random() * 9)))
      if (chance(0.4)) setLine(UPDATE_RUNNING_LINES[Math.floor(Math.random() * UPDATE_RUNNING_LINES.length)])
    }, 900)
    return () => clearInterval(id)
  }, [running])
  if (!running) return null
  return (
    <div className="fullscreen update-screen sl-serenity">
      <div>
        <div className="update-spinner">🌀</div>
        <p>ClarityOne Endpoint Serenity™</p>
        <p>{line}</p>
        <p>{Math.min(pct, 97)}% complete</p>
        <p className="update-small">Current time: {fmtClock(clockMin)} · Timesheet cutoff: 5:00 PM</p>
        <p className="update-small">Your timesheet is safe. It is also inaccessible. These are both true.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sign & Submit: the attestation, then the manager multiple-choice exam.
// ---------------------------------------------------------------------------

function Attestation() {
  const attesting = useTimesheet(s => s.attesting)
  const cancelAttest = useTimesheet(s => s.cancelAttest)
  const failAttest = useTimesheet(s => s.failAttest)
  const completeAttest = useTimesheet(s => s.completeAttest)
  const [agreed, setAgreed] = useState(false)
  const [manager, setManager] = useState('')

  useEffect(() => {
    if (attesting) { setAgreed(false); setManager('') }
  }, [attesting])

  if (!attesting) return null

  const sign = () => {
    if (manager === CORRECT_MANAGER) completeAttest()
    else failAttest(WRONG_MANAGER_MSG)
  }

  return (
    <div className="sl-overlay">
      <div className="window sl-attest">
        <div className="title-bar">
          <div className="title-bar-text">Sign and Submit — Attestation of Temporal Truth</div>
        </div>
        <div className="window-body sl-attest-body">
          <div className="sl-attest-legal">{ATTESTATION_TEXT}</div>
          <label className="sl-attest-check">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>I have read the above and become it.</span>
          </label>
          <label className="sl-attest-mgr">
            <span>Select your approving manager (choose carefully):</span>
            <select value={manager} onChange={e => setManager(e.target.value)}>
              <option value="" disabled>— select approver —</option>
              {MANAGER_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <div className="sl-attest-actions">
            <button onClick={cancelAttest}>Return to grid</button>
            <button className="sl-primary" disabled={!agreed || !manager} onClick={sign}>
              Sign and Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** All StrategyLens-module overlays, stacked in escalating order of menace. */
export default function SLOverlays() {
  return (
    <>
      <UpdateOffer />
      <EmailInterrupt />
      <ComplianceAlert />
      <Attestation />
      <SerenityUpdate />
    </>
  )
}
