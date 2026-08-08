import { useGame } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { useTimesheet, pickPreloaded, type UiPart } from '../state/timesheet'
import { SL } from './difficulty'
import { trackInput } from './engine'
import {
  START_EMAIL_IDS, INTERRUPT_EMAIL_IDS, SL_EMAILS,
  SL_TOASTS_AMBIENT, SL_TOASTS_APP, SL_ERRORS, CHAT_SENDERS, CHAT_SALUTATIONS, CHAT_NVM, CHAT_NAGS, CHRONO_TIPS,
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

/**
 * StrategyLens-sourced nuisances (its errors, Chrono's hints, vanishing UI,
 * server-value reverts) only fire while the app is actually open — software
 * cannot disappoint you before you run it. Minimized still counts: it's
 * running, it knows.
 */
function slAppOpen(): boolean {
  return useWins.getState().wins.some(w => w.app === 'strategylens')
}

/** Giant email popups (and receipt demands) require ClarityMail to be running. */
function mailOpen(): boolean {
  return useWins.getState().wins.some(w => w.app === 'claritymail')
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
  const t = useTimesheet.getState()
  // Each email interrupts once. Sending a read receipt makes its sender's
  // follow-up nag eligible — they KNOW you read it. When the well runs dry,
  // Compliance repeats.
  const fresh = INTERRUPT_EMAIL_IDS.filter(id => !firedEmails.has(id))
  const nags = SL_EMAILS
    .filter(e => e.nagOf && t.receiptsFrom.includes(e.nagOf) && !firedEmails.has(e.id))
    .map(e => e.id)
  const pool = [...fresh, ...nags]
  const id = pool.length > 0 ? randOf(pool) : 'urgent1'
  firedEmails.add(id)
  // Popup only when the mail client is running; otherwise the message lands
  // quietly in the inbox and the tray tattles about it.
  if (mailOpen()) {
    t.deliverEmail(id, true)
  } else {
    t.deliverEmail(id, false)
    const email = SL_EMAILS.find(e => e.id === id)!
    usePopups.getState().toast(`📨 ClarityMail: 1 new message from ${email.from}. It can wait. It says it can't.`)
  }
}

function fireChat() {
  const t = useTimesheet.getState()
  if (t.updateRunning) return
  // One outstanding un-dealt-with ping per sender, max.
  const activeSenders = new Set(t.chats.filter(c => c.state === 'pinged').map(c => c.senderId))

  // Receipt aftermath: at the SAME cadence, a ping may come from someone who
  // knows you read their email instead of another bare salutation.
  const nagKeys = t.receiptsFrom.filter(id => CHAT_NAGS[id] && !activeSenders.has(CHAT_NAGS[id].senderId))
  if (nagKeys.length > 0 && Math.random() < SL.receiptChatNagChance) {
    const nag = CHAT_NAGS[randOf(nagKeys)]
    t.spawnChat(nag.senderId, nag.name, nag.title, fill(randOf(nag.lines), t.playerName))
    return
  }

  const senders = CHAT_SENDERS.filter(s => !activeSenders.has(s.id))
  if (senders.length === 0) return
  const sender = randOf(senders)
  const text = fill(randOf(CHAT_SALUTATIONS), t.playerName)
  t.spawnChat(sender.id, sender.name, sender.title, text)
}

/** Called by the chat UI when the player takes the bait. */
export function chatReplied(chatId: number) {
  const t = useTimesheet.getState()
  const chat = t.chats.find(c => c.id === chatId)
  // Brad types for a moment, then his out-of-office engages. It was already
  // written. He pinged you on his way out the door.
  if (chat?.senderId === 'brad') {
    setTimeout(() => t.setChatState(chatId, 'ooo'), rand(2500, 5000))
    return
  }
  setTimeout(() => t.setChatState(chatId, 'away'), rand(2000, 5000))
  // Only the core cast bothers to say nvm; automated accounts never follow up.
  const coreCast = CHAT_SENDERS.some(s => s.id === chat?.senderId)
  if (coreCast && Math.random() < SL.chatNvmChance) {
    setTimeout(() => {
      const current = useTimesheet.getState().chats.find(c => c.id === chatId)
      if (playing() && current?.state === 'away') useTimesheet.getState().setChatState(chatId, 'nvm')
    }, gap(SL.chatNvmMs))
  }
}

/** Called by the interrupt UI when the player clicks [Not Now]. It is never now. */
export function scheduleReceiptReprompt(emailId: string) {
  setTimeout(() => {
    if (!playing()) return
    if (stageBusy() || !mailOpen()) {
      // Someone else is interrupting, or the client is closed; the receipt
      // waits its turn, patiently, forever.
      scheduleReceiptReprompt(emailId)
      return
    }
    useTimesheet.getState().repromptReceipt(emailId)
  }, SL.notNowRepromptMs)
}

function fireVanish() {
  const t = useTimesheet.getState()
  if (t.updateRunning || !slAppOpen()) return
  const parts: UiPart[] = ['grid', 'submit', 'selectwork', 'total', 'toolbar', 'colFri']
  const part = randOf(parts)
  if (t.hidden[part]) return
  t.hideUi(part)
  setTimeout(() => useTimesheet.getState().showUi(part), gap(SL.vanishDurMs))
}

function fireError() {
  if (stageBusy() || !slAppOpen()) return
  usePopups.getState().spawnError(randOf(SL_ERRORS))
}

function fireToast() {
  const pool = slAppOpen() ? [...SL_TOASTS_AMBIENT, ...SL_TOASTS_APP] : SL_TOASTS_AMBIENT
  usePopups.getState().toast(randOf(pool))
}

function fireChrono() {
  if (stageBusy() || !slAppOpen()) return
  usePopups.getState().showBindows(randOf(CHRONO_TIPS))
}

function fireRevert() {
  const t = useTimesheet.getState()
  if (t.updateRunning || !slAppOpen() || Math.random() >= SL.cellRevertChance) return
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
