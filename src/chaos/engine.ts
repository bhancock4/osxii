import { useGame, config } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { TOASTS } from '../content/errors'
import { DAY_MS } from './difficulty'

// Module-level state is reset only by a full page reload — "Play Again" is
// window.location.reload() on purpose. In-place restart would leak intervals,
// listeners, and these counters; don't add one without redesigning this file.
let started = false
let clickCount = 0
let clickThreshold = 18 + Math.floor(Math.random() * 9)
let lastActivity = Date.now()

/** Raw input-event counters for the whole session; hashed into score submissions. */
const inputStats = { moves: 0, clicks: 0, keys: 0 }

export function getSessionStats(): { moves: number; clicks: number; keys: number } {
  return { ...inputStats }
}

/** Ramps 0 → 1 over the first 2.5 minutes of play */
function chaosLevel(): number {
  const elapsed = Date.now() - useGame.getState().startedAt
  return Math.min(1, elapsed / 150000)
}

function playing(): boolean {
  return useGame.getState().status === 'playing'
}

function paused(): boolean {
  const p = usePopups.getState()
  // Consequences that steal control also stop the clock — losing to renewals
  // you couldn't have prevented isn't funny, it's just unfair.
  return useGame.getState().locked || p.updateOverlay || p.bsod || p.hung || p.hacked
}

function idleMs(): number {
  return Date.now() - lastActivity
}

function tick() {
  if (!playing() || paused()) return
  const { spawnAd, spawnError, spawnConfirm, showBindows, showUpdate, toast } = usePopups.getState()
  const c = config()
  const elapsed = Date.now() - useGame.getState().startedAt
  if (elapsed < c.graceMs) return // grace period: let them read the README
  const level = chaosLevel()
  const mul = c.chaosMul
  // Idle players get *clearable* annoyances (errors, prompts, tips) — the
  // punishment for wandering off is busywork, never silent bankruptcy.
  const nag = idleMs() > c.idleNagMs ? 1.8 : 1
  // One roll, accumulating thresholds: events are mutually exclusive and the
  // ORDER of pick() calls below is part of the tuning — reordering changes odds.
  const roll = Math.random()
  let acc = 0
  const pick = (p: number) => {
    acc += p
    return roll < acc
  }
  if (pick((0.05 + 0.08 * level) * mul)) return spawnAd()
  if (pick((0.05 + 0.06 * level) * mul * nag)) return spawnError()
  if (pick((0.02 + 0.03 * level) * mul * nag)) return spawnConfirm()
  if (pick(0.04 * level * mul)) {
    if (useWins.getState().minimizeRandom()) toast('✨ OSXii optimized your workspace!')
    return
  }
  if (pick(0.06 * nag)) return showBindows()
  if (pick(0.03 * level * mul)) return showUpdate()
  if (pick(0.08)) return toast(TOASTS[Math.floor(Math.random() * TOASTS.length)])
}

function dayTick() {
  if (!playing() || paused()) return
  const g = useGame.getState()
  const c = config()
  const result = g.advanceDay()
  const { toast } = usePopups.getState()
  if (result && result.charged > 0) {
    toast(
      result.overdraft
        ? `💳 Renewals: -$${result.charged.toFixed(2)}. Overdraft Protection™ saved you. Once. Never again.`
        : `💳 It's Day 1! Renewals processed: -$${result.charged.toFixed(2)} (OSXii Time Compression™)`
    )
    return
  }
  // Heads-up a few days before an unaffordable renewal — the loss should be
  // visible on the calendar, never a surprise.
  const after = useGame.getState()
  const total = after.subscriptions.reduce((s, sub) => s + sub.price, 0)
  if (total > 0 && after.day === c.monthDays - 5 && after.balance - total <= 0) {
    toast(`⚠️ Renewals of $${total.toFixed(2)} due on Day 1. You cannot afford them. Just so you know.`)
  }
}

function lockTick() {
  if (!playing() || paused()) return
  if (idleMs() >= config().lockIdleMs) {
    useGame.getState().lock()
  }
}

function onActivity() {
  lastActivity = Date.now()
}

/**
 * Reset the idle clock from outside the engine. Consequences that BLOCK input
 * (hacker takeover, hang) must call this when control returns — otherwise the
 * player's forced helplessness reads as idleness and the lock screen pounces
 * the moment they get their mouse back.
 */
export function markActivity(): void {
  onActivity()
}

function onMove() {
  inputStats.moves++
  onActivity()
}

function onDown() {
  inputStats.clicks++
  onActivity()
}

function onKey() {
  inputStats.keys++
  onActivity()
}

function onGlobalClick() {
  if (!playing()) return
  clickCount++
  if (clickCount >= clickThreshold) {
    clickCount = 0
    clickThreshold = 18 + Math.floor(Math.random() * 9)
    usePopups.getState().spawnAd()
  }
}

export function startChaos() {
  if (started) return
  started = true
  window.addEventListener('click', onGlobalClick, true)
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true, capture: true })
  window.addEventListener('keydown', onKey, { passive: true, capture: true })
  lastActivity = Date.now()
  setInterval(tick, 3000)
  setInterval(dayTick, DAY_MS)
  setInterval(lockTick, 1000)
}

// ---- Targeted sabotage helpers ----

let sabotageCount = 0

/** SmartAssist™: occasionally "improves" a winning document. Bounded per difficulty, always announced. */
export function maybeSabotageText(text: string): { text: string; sabotaged: boolean } {
  if (sabotageCount >= config().sabotageMax) return { text, sabotaged: false }
  if (text.trimEnd() !== 'I did it!') return { text, sabotaged: false }
  if (Math.random() < 0.45) {
    sabotageCount++
    const mangled = Math.random() < 0.5 ? 'i did it!' : 'I did it! 🙂'
    return { text: mangled, sabotaged: true }
  }
  return { text, sabotaged: false }
}

/** Random async delay for file operations: 400ms – 5s */
export function chaoticDelay(): number {
  return 400 + Math.random() * 4600
}

export function chance(p: number): boolean {
  return Math.random() < p
}
