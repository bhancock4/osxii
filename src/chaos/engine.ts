import { useGame } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { TOASTS } from '../content/errors'

let started = false
let clickCount = 0
let clickThreshold = 12 + Math.floor(Math.random() * 7)

/** Ramps 0 → 1 over the first 2.5 minutes of play */
function chaosLevel(): number {
  const elapsed = Date.now() - useGame.getState().startedAt
  return Math.min(1, elapsed / 150000)
}

function playing(): boolean {
  return useGame.getState().status === 'playing'
}

function tick() {
  if (!playing()) return
  const { updateOverlay, spawnAd, spawnError, showBindows, showUpdate, toast } = usePopups.getState()
  if (updateOverlay) return
  const elapsed = Date.now() - useGame.getState().startedAt
  if (elapsed < 15000) return // grace period: let them read the README
  const level = chaosLevel()
  const roll = Math.random()
  let acc = 0
  const pick = (p: number) => {
    acc += p
    return roll < acc
  }
  if (pick(0.07 + 0.12 * level)) return spawnAd()
  if (pick(0.07 + 0.08 * level)) return spawnError()
  if (pick(0.05 * level)) {
    if (useWins.getState().minimizeRandom()) toast('✨ Wondows optimized your workspace!')
    return
  }
  if (pick(0.06)) return showBindows()
  if (pick(0.04 * level)) return showUpdate()
  if (pick(0.08)) return toast(TOASTS[Math.floor(Math.random() * TOASTS.length)])
}

function renewTick() {
  if (!playing()) return
  const charged = useGame.getState().renewAll()
  if (charged > 0) {
    usePopups.getState().toast(`💳 Monthly renewals processed: -$${charged.toFixed(2)} (Wondows Time Compression™)`)
  }
}

function onGlobalClick() {
  if (!playing()) return
  clickCount++
  if (clickCount >= clickThreshold) {
    clickCount = 0
    clickThreshold = 12 + Math.floor(Math.random() * 7)
    usePopups.getState().spawnAd()
  }
}

export function startChaos() {
  if (started) return
  started = true
  window.addEventListener('click', onGlobalClick, true)
  setInterval(tick, 3000)
  setInterval(renewTick, 30000)
}

// ---- Targeted sabotage helpers ----

let sabotageCount = 0

/** SmartAssist™: occasionally "improves" a winning document. Max twice, always announced. */
export function maybeSabotageText(text: string): { text: string; sabotaged: boolean } {
  if (sabotageCount >= 2) return { text, sabotaged: false }
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
