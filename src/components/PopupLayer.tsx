import { useEffect, useMemo, useState } from 'react'
import { usePopups, type Popup } from '../state/popups'
import { useGame } from '../state/game'
import type { AdSpec } from '../content/types'

function AdPopup({ popup, ad, offset }: { popup: Popup; ad: AdSpec; offset: number }) {
  const closePopup = usePopups(s => s.closePopup)
  const toast = usePopups(s => s.toast)
  const buySub = useGame(s => s.buySub)
  const adClosed = useGame(s => s.adClosed)
  const [countdown, setCountdown] = useState(ad.closeStyle === 'delayed' ? 3 : 0)
  const corner = useMemo(
    () => (['tl', 'tr', 'bl', 'br'] as const)[popup.id % 4],
    [popup.id]
  )

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  const subscribe = (viaDecoy: boolean) => {
    buySub(ad.productName, ad.monthlyCost)
    closePopup(popup.id)
    toast(
      viaDecoy
        ? `That ✕ was part of the ad. Subscribed to ${ad.productName}! Reading is a premium feature.`
        : `🎉 Subscribed to ${ad.productName}! First payment of $${ad.monthlyCost.toFixed(2)} processed.`
    )
  }

  const realClose = () => {
    adClosed()
    closePopup(popup.id)
  }

  return (
    <div className="popup" style={{ transform: `translate(-50%, -50%) translate(${offset * 34}px, ${offset * 34}px)` }}>
      <div className={`ad ad-${ad.theme}`}>
        {ad.closeStyle === 'tiny' && (
          <button className="ad-close-tiny" onClick={realClose} title="Close">×</button>
        )}
        {ad.closeStyle === 'corner' && (
          <button className={`ad-close-corner ad-close-${corner}`} onClick={realClose}>✕</button>
        )}
        {ad.closeStyle === 'decoy' && (
          <button className="ad-close-decoy" onClick={() => subscribe(true)}>✕</button>
        )}
        {ad.closeStyle === 'delayed' &&
          (countdown > 0 ? (
            <span className="ad-close-countdown">You may close this ad in {countdown}…</span>
          ) : (
            <button className="ad-close-tiny" onClick={realClose} title="Close">×</button>
          ))}

        <div className="ad-headline">{ad.headline}</div>
        <div className="ad-product">{ad.productName}</div>
        <div className="ad-body">{ad.body}</div>
        <div className="ad-price">{ad.price}</div>
        <button className="cta" onClick={() => subscribe(false)}>{ad.ctaLabel}</button>
        {ad.closeStyle === 'decoy' && (
          <button className="ad-nothanks" onClick={realClose}>
            no thanks, I hate saving money
          </button>
        )}
      </div>
    </div>
  )
}

function ConfirmPopup({ popup, offset }: { popup: Popup; offset: number }) {
  const closePopup = usePopups(s => s.closePopup)
  const toast = usePopups(s => s.toast)
  const promptSurvived = useGame(s => s.promptSurvived)
  const c = popup.confirm!
  // Keep them on their toes: OK and Cancel swap sides per prompt.
  const swapped = popup.id % 2 === 1
  const answer = (text: string) => {
    promptSurvived()
    closePopup(popup.id)
    toast(text)
  }
  const okBtn = <button key="ok" onClick={() => answer(c.okToast)}>{c.okLabel}</button>
  const cancelBtn = <button key="cancel" onClick={() => answer(c.cancelToast)}>{c.cancelLabel}</button>
  return (
    <div className="popup" style={{ transform: `translate(-50%, -50%) translate(${offset * 34 - 40}px, ${offset * 34 + 30}px)` }}>
      <div className="window error-dialog">
        <div className="title-bar">
          <div className="title-bar-text">{c.title}</div>
        </div>
        <div className="window-body">
          <div className="error-row">
            <span className="error-icon">⚠️</span>
            <p>{c.body}</p>
          </div>
          <div className="error-buttons confirm-buttons">
            {swapped ? [cancelBtn, okBtn] : [okBtn, cancelBtn]}
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorPopup({ popup, offset }: { popup: Popup; offset: number }) {
  const closePopup = usePopups(s => s.closePopup)
  const errorSeen = useGame(s => s.errorSeen)
  const e = popup.error!
  return (
    <div className="popup" style={{ transform: `translate(-50%, -50%) translate(${offset * 34 + 60}px, ${offset * 34 - 60}px)` }}>
      <div className="window error-dialog">
        <div className="title-bar">
          <div className="title-bar-text">{e.title}</div>
        </div>
        <div className="window-body">
          <div className="error-row">
            <span className="error-icon">❌</span>
            <p>{e.body}</p>
          </div>
          <div className="error-buttons">
            <button onClick={() => { errorSeen(); closePopup(popup.id) }}>{e.button}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PopupLayer() {
  const popups = usePopups(s => s.popups)
  if (popups.length === 0) return null
  return (
    <>
      <div className="ad-overlay" />
      {popups.map((p, i) =>
        p.kind === 'ad' ? (
          <AdPopup key={p.id} popup={p} ad={p.ad!} offset={i} />
        ) : p.kind === 'confirm' ? (
          <ConfirmPopup key={p.id} popup={p} offset={i} />
        ) : (
          <ErrorPopup key={p.id} popup={p} offset={i} />
        )
      )}
    </>
  )
}
