import { useEffect, useRef, useState } from 'react'
import { usePopups } from '../state/popups'

/** The blue screen. Collects a fake percentage, then lets you pretend it didn't happen. */
export function Bsod() {
  const [pct, setPct] = useState(0)
  const done = pct >= 100

  useEffect(() => {
    const id = setInterval(() => {
      setPct(p => Math.min(100, p + Math.floor(3 + Math.random() * 12)))
    }, 450)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!done) return
    const dismiss = () => usePopups.setState({ bsod: false })
    window.addEventListener('keydown', dismiss)
    window.addEventListener('pointerdown', dismiss)
    return () => {
      window.removeEventListener('keydown', dismiss)
      window.removeEventListener('pointerdown', dismiss)
    }
  }, [done])

  return (
    <div className="fullscreen bsod-screen">
      <div className="bsod-body">
        <h1>:(</h1>
        <p>
          OSXii ran into a problem that it created, nurtured, and released into
          production. We are collecting some error info for a report nobody will read.
        </p>
        <p className="bsod-pct">{pct}% complete</p>
        <p className="bsod-small">
          Stop code: YOU_CLICKED_OK
          <br />
          What failed: your judgment, briefly. It happens.
        </p>
        {done && <p className="bsod-continue">Press any key to pretend this didn’t happen.</p>}
      </div>
    </div>
  )
}

/** Blocks all input for the duration of a hang. The cursor waits. So do you. */
export function HangBlocker() {
  return <div className="hang-blocker" />
}

/**
 * The hacker's cursor: green, autonomous, and busier than you. Wanders
 * between random targets while the real pointer is disabled.
 */
export function HackerCursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let tx = x
    let ty = y
    let raf = 0
    const retarget = () => {
      tx = 60 + Math.random() * (window.innerWidth - 120)
      ty = 60 + Math.random() * (window.innerHeight - 160)
    }
    const targetTimer = setInterval(retarget, 900)
    retarget()
    const loop = () => {
      x += (tx - x) * 0.12
      y += (ty - y) * 0.12
      if (ref.current) ref.current.style.transform = `translate(${x}px, ${y}px)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      clearInterval(targetTimer)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="hacker-cursor" ref={ref}>
      <svg width="18" height="24" viewBox="0 0 18 24">
        <path d="M1 1 L1 18 L5.5 14.5 L8.5 21.5 L11.5 20 L8.5 13.5 L14 13 Z" fill="#39ff5a" stroke="#003300" strokeWidth="1.4" />
      </svg>
      <span className="hacker-tag">Remote Assistance™</span>
    </div>
  )
}

/** Renders whichever system-level catastrophe is currently active. */
export default function SystemOverlays() {
  const bsod = usePopups(s => s.bsod)
  const hung = usePopups(s => s.hung)
  const hacked = usePopups(s => s.hacked)
  return (
    <>
      {hung && <HangBlocker />}
      {hacked && (
        <>
          <div className="hacker-blocker" />
          <HackerCursor />
        </>
      )}
      {bsod && <Bsod />}
    </>
  )
}
