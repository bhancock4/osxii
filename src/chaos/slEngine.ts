import { useGame } from '../state/game'
import { usePopups } from '../state/popups'
import { useTimesheet, pickPreloaded, type UiPart } from '../state/timesheet'
import { SL } from './difficulty'
import { trackInput } from './engine'
import {
  START_EMAIL_IDS, INTERRUPT_EMAIL_IDS, SL_EMAILS,
  SL_TOASTS, SL_ERRORS, CHAT_SENDERS, CHAT_SALUTATIONS, CHAT_NVM, CHRONO_TIPS,
  fill,
} from '../content/strategylens'

// Module-level state resets only via full page reload — "Play Again" is
// window.location.reload(), same invariant as engine.ts. Do not add an
// in-place restart.
let started = false

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const gap = ([min, max]: [number, number]) => rand(min, max)
const randOf = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function playing(): boolean {
  return useGame.getState().status === 'playing'
}

/** Interruptions queue politely behind whatever is already interrupting. */
function stageBusy(): boolean {
  const t = useTimesheet.getState()
  return t.interrupt !== null || t.compliance !== null || t.updateRunning || t.updateOfferVisible
}

// ---- Clock & the day's fixed appointments ----

/** Game minute when the update overlay releases: 10 real seconds of hope. */
export function updateReleaseMin(): number {
  return SL.deadlineMin - Math.ceil(SL.updateHopeRealMs / SL.gameMinMs)
}

function clockTick(offerMin: number) {
  if (!playing()) return
  const t = useTimesheet.getState()
  t.tickMinute()
  const min = useTimesheet.getState().clockMin
  const { toast } = usePopups.getState()

  if (min >= offerMin && !t.updateAnswered && !t.updateOfferVisible && !t.updateRunning && t.interrupt === null && t.compliance === null) {
    t.offerUpdate()
  }

  if (min === SL.updateFireMin && !t.updateDeferred && !t.updateRunning) {
    useTimesheet.getState().setUpdateRunning(true)
  }

  if (t.updateRunning && min >= updateReleaseMin()) {
    useTimesheet.getState().setUpdateRunning(false)
    toast('✅ Serenity achieved. Your endpoint is calm. You have until 5:00 PM.')
  }

  // Escalating dread, on the hour.
  if (min === 12 * 60) toast('🕐 It is noon. Your timesheet is thinking about you too.')
  if (min === 15 * 60) toast('🕒 3:00 PM. Two hours to cutoff. Finance has begun refreshing.')
  if (min === 16 * 60 + 45) toast('🕓 4:45 PM. Fifteen minutes. The grid believes in you, contractually.')

  if (min >= SL.deadlineMin) {
    useGame.getState().slLose()
  }
}

// ---- Recurring nuisances (each reschedules itself) ----

function loop(fn: () => void, ms: () => number) {
  const run = () => {
    if (playing()) fn()
    if (useGame.getState().status === 'playing' || useGame.getState().status === 'boot') {
      setTimeout(run, ms())
    }
  }
  setTimeout(run, ms())
}

const firedEmails = new Set<string>()

function fireEmail() {
  if (stageBusy()) return
  // Each email interrupts once; when the well runs dry, Compliance repeats.
  const fresh = INTERRUPT_EMAIL_IDS.filter(id => !firedEmails.has(id))
  const id = fresh.length > 0 ? randOf(fresh) : 'urgent1'
  firedEmails.add(id)
  useTimesheet.getState().deliverEmail(id, true)
}

function fireChat() {
  const t = useTimesheet.getState()
  if (t.updateRunning) return
  // One outstanding un-dealt-with ping per sender, max.
  const activeSenders = new Set(t.chats.filter(c => c.state === 'pinged').map(c => c.senderId))
  const senders = CHAT_SENDERS.filter(s => !activeSenders.has(s.id))
  if (senders.length === 0) return
  const sender = randOf(senders)
  const text = fill(randOf(CHAT_SALUTATIONS), t.playerName)
  t.spawnChat(sender.id, sender.name, sender.title, text)
}

/** Called by the chat UI when the player takes the bait. */
export function chatReplied(chatId: number) {
  const t = useTimesheet.getState()
  setTimeout(() => t.setChatState(chatId, 'away'), rand(2000, 5000))
  if (Math.random() < SL.chatNvmChance) {
    setTimeout(() => {
      if (playing()) useTimesheet.getState().setChatState(chatId, 'nvm')
    }, gap(SL.chatNvmMs))
  }
}

/** Called by the interrupt UI when the player clicks [Not Now]. It is never now. */
export function scheduleReceiptReprompt(emailId: string) {
  setTimeout(() => {
    if (!playing()) return
    if (stageBusy()) {
      // Someone else is interrupting; the receipt waits its turn, patiently, forever.
      scheduleReceiptReprompt(emailId)
      return
    }
    useTimesheet.getState().repromptReceipt(emailId)
  }, SL.notNowRepromptMs)
}

function fireVanish() {
  const t = useTimesheet.getState()
  if (t.updateRunning) return
  const parts: UiPart[] = ['grid', 'submit', 'selectwork', 'total', 'toolbar', 'colFri']
  const part = randOf(parts)
  if (t.hidden[part]) return
  t.hideUi(part)
  setTimeout(() => useTimesheet.getState().showUi(part), gap(SL.vanishDurMs))
}

function fireError() {
  if (stageBusy()) return
  usePopups.getState().spawnError(randOf(SL_ERRORS))
}

function fireToast() {
  usePopups.getState().toast(randOf(SL_TOASTS))
}

function fireChrono() {
  if (stageBusy()) return
  usePopups.getState().showBindows(randOf(CHRONO_TIPS))
}

function fireRevert() {
  const t = useTimesheet.getState()
  if (t.updateRunning || Math.random() >= SL.cellRevertChance) return
  const reverted = t.revertRandomCell()
  if (reverted) {
    usePopups.getState().toast(`🔄 ${reverted.code}: cell restored to the server value (0.00). The server was very sure.`)
  }
}

// ---- Entry point ----

export function startStrategyLens(name: string) {
  if (started) return
  started = true
  trackInput()

  useTimesheet.getState().begin(name, START_EMAIL_IDS, pickPreloaded(SL.preloadedProjects))

  // Quiet first stretch: read the mail, meet the grid. Interruptions ramp in
  // once the player has something to lose.
  const offerMin = Math.round(rand(SL.updateOfferMin[0], SL.updateOfferMin[1]))
  setInterval(() => clockTick(offerMin), SL.gameMinMs)

  loop(fireEmail, () => gap(SL.emailGapMs))
  loop(fireChat, () => gap(SL.chatGapMs))
  loop(fireVanish, () => gap(SL.vanishGapMs))
  loop(fireError, () => gap(SL.errorGapMs))
  loop(fireToast, () => gap(SL.toastGapMs))
  loop(fireChrono, () => gap(SL.chronoGapMs))
  loop(fireRevert, () => 15000)
}

/** Look up an email by id (interrupt + inbox UIs share this). */
export function emailById(id: string) {
  return SL_EMAILS.find(e => e.id === id)!
}

export { CHAT_NVM }
