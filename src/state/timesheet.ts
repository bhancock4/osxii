import { create } from 'zustand'
import { SL } from '../chaos/difficulty'
import {
  SL_ITEM_BY_ID, SL_EMAILS, REQUIRED_PROJECT_IDS, BUCKET_IDS, VAL_MSG,
  COMPLIANCE_TRIPWIRE, COMPLIANCE_OVERBOOK, type SLEmail,
} from '../content/strategylens'

const SL_EMAIL_BY_ID: Record<string, SLEmail> = Object.fromEntries(SL_EMAILS.map(e => [e.id, e]))
import { useGame } from './game'

/**
 * StrategyLens® Time Entry state. Timers and scheduling live in
 * src/chaos/slEngine.ts; this store is the single source of truth for the
 * workday clock, the grid, the inbox, and the various institutions currently
 * disappointed in the player.
 */

/** Grid columns. Only Mon–Fri (1–5) accept time without a form. */
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const EDITABLE_DAYS = [1, 2, 3, 4, 5]

/** UI regions the vanish scheduler may take away for 5–10 seconds. */
export type UiPart = 'grid' | 'submit' | 'selectwork' | 'total' | 'toolbar' | 'colFri'

export interface SLChat {
  id: number
  senderId: string
  senderName: string
  senderTitle: string
  /** The entire message. A salutation. Nothing follows. */
  text: string
  /** 'ooo': replied to, then immediately Out of Office for a month (Brad). */
  state: 'pinged' | 'replied' | 'away' | 'nvm' | 'ooo'
  playerReply?: string
}

export interface SLInterrupt {
  emailId: string
  /** reading → the giant email; receipt → the receipt demand; reprompt → "It is now." */
  phase: 'reading' | 'receipt' | 'reprompt'
}

export interface SLStats {
  strikes: number
  interruptionsClosed: number
  receiptsSent: number
  validationFails: number
  emailsRead: number
}

// ---------------------------------------------------------------------------
// Pure grid math (unit-tested; mirrors nothing server-side — the doctrine IS
// the implementation)
// ---------------------------------------------------------------------------

export type Entries = Record<string, number[]>

export const emptyWeek = (): number[] => [0, 0, 0, 0, 0, 0, 0]

export function rowTotal(entries: Entries, itemId: string): number {
  return (entries[itemId] ?? emptyWeek()).reduce((s, h) => s + h, 0)
}

export function weekTotal(entries: Entries): number {
  return Object.keys(entries).reduce((s, id) => s + rowTotal(entries, id), 0)
}

function isQuarter(h: number): boolean {
  return Math.abs(h * 4 - Math.round(h * 4)) < 1e-9
}

/**
 * The validator's actual doctrine, applied one grievance at a time (fixing
 * one reveals the next — enterprise software never shows you the whole list).
 * Returns null when the timesheet is, regrettably, acceptable.
 */
export function validateTimesheet(entries: Entries, onCard: string[]): string | null {
  const rows = onCard.map(id => ({ id, item: SL_ITEM_BY_ID[id], week: entries[id] ?? emptyWeek() }))

  for (const r of rows) {
    if ((r.week[0] ?? 0) > 0 || (r.week[6] ?? 0) > 0) return VAL_MSG.weekend
  }
  for (const r of rows) {
    if (r.week.some(h => h < 0 || !isQuarter(h))) return VAL_MSG.increment(r.item.code)
  }
  for (const r of rows) {
    if (r.item.tripwire && rowTotal(entries, r.id) > 0) return VAL_MSG.flagged(r.item.code)
  }
  for (const r of rows) {
    if (r.item.remaining !== null && rowTotal(entries, r.id) > r.item.remaining + 1e-9) {
      return VAL_MSG.overRemaining(r.item.code)
    }
  }

  const total = weekTotal(entries)
  if (total > SL.weekTotal + 1e-9) return VAL_MSG.overtime
  if (Math.abs(total - SL.weekTotal) > 1e-9) return VAL_MSG.total(total)

  const admin = rowTotal(entries, 'admin')
  if (admin > SL.adminMax + 1e-9) return VAL_MSG.adminOver
  if (admin < SL.adminMin - 1e-9) return VAL_MSG.adminZero
  if (rowTotal(entries, 'pt') < 0.25 - 1e-9) return VAL_MSG.ptZero

  for (const id of REQUIRED_PROJECT_IDS) {
    if (!onCard.includes(id) || rowTotal(entries, id) < 1e-9) {
      return VAL_MSG.missing(SL_ITEM_BY_ID[id].code)
    }
  }
  return null
}

/** Random subset of required projects preloaded onto the card at 6:00 AM. */
export function pickPreloaded(count: number, rand: () => number = Math.random): string[] {
  const pool = [...REQUIRED_PROJECT_IDS]
  const picked: string[] = []
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  }
  // Card order mirrors catalog order so groups render together.
  return REQUIRED_PROJECT_IDS.filter(id => picked.includes(id))
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let nextChatId = 1

interface TSState {
  /** 3-letter resource identifier, demanded up front. */
  playerName: string
  /** Minutes since midnight on the in-game clock. Never pauses. Deadlines don't. */
  clockMin: number
  entries: Entries
  onCard: string[]
  hidden: Partial<Record<UiPart, boolean>>
  /** Inbox, newest first. Ids into SL_EMAILS with in-game arrival time. */
  inbox: { id: string; atMin: number }[]
  read: Record<string, boolean>
  interrupt: SLInterrupt | null
  /** Emails whose read receipt was sent. Their senders now know. */
  receiptsFrom: string[]
  compliance: { title: string; body: string } | null
  updateOfferVisible: boolean
  updateDeferred: boolean
  updateAnswered: boolean
  updateRunning: boolean
  chats: SLChat[]
  openChatId: number | null
  attesting: boolean
  valError: string | null
  submitted: boolean
  stats: SLStats
  /** Items that have already earned their compliance popup (one scare per crime). */
  struck: Record<string, boolean>

  begin: (name: string, startInbox: string[], preloaded: string[]) => void
  tickMinute: () => void
  setCell: (itemId: string, day: number, hours: number) => void
  addToCard: (itemId: string) => void
  deliverEmail: (id: string, asInterrupt: boolean) => void
  markRead: (id: string) => void
  removeChat: (id: number) => void
  dismissInterrupt: () => void
  demandReceipt: () => void
  sendReceipt: () => void
  notNow: () => void
  repromptReceipt: (emailId: string) => void
  showCompliance: (title: string, body: string) => void
  closeCompliance: () => void
  offerUpdate: () => void
  answerUpdate: (deferred: boolean) => void
  setUpdateRunning: (running: boolean) => void
  spawnChat: (senderId: string, senderName: string, senderTitle: string, text: string) => number
  replyChat: (id: number, reply: string) => void
  setChatState: (id: number, state: SLChat['state']) => void
  setOpenChat: (id: number | null) => void
  hideUi: (part: UiPart) => void
  showUi: (part: UiPart) => void
  trySubmit: () => void
  clearValError: () => void
  cancelAttest: () => void
  /** Wrong approver: bounced back to the grid with a note in your file. */
  failAttest: (msg: string) => void
  completeAttest: () => void
  revertRandomCell: () => { code: string } | null
}

export const useTimesheet = create<TSState>()((set, get) => ({
  playerName: '',
  clockMin: SL.startMin,
  entries: {},
  onCard: [],
  hidden: {},
  inbox: [],
  read: {},
  interrupt: null,
  receiptsFrom: [],
  compliance: null,
  updateOfferVisible: false,
  updateDeferred: false,
  updateAnswered: false,
  updateRunning: false,
  chats: [],
  openChatId: null,
  attesting: false,
  valError: null,
  submitted: false,
  stats: { strikes: 0, interruptionsClosed: 0, receiptsSent: 0, validationFails: 0, emailsRead: 0 },
  struck: {},

  begin: (name, startInbox, preloaded) => {
    const onCard = [...preloaded, ...BUCKET_IDS]
    const entries: Entries = {}
    for (const id of onCard) entries[id] = emptyWeek()
    // Overnight arrivals: the reminders were waiting for you before you were awake.
    const inbox = [...startInbox].reverse().map((id, i) => ({ id, atMin: SL.startMin - 7 - i * 41 }))
    set({ playerName: name, clockMin: SL.startMin, onCard, entries, inbox })
  },

  tickMinute: () => set(s => ({ clockMin: s.clockMin + 1 })),

  setCell: (itemId, day, hours) => {
    const { entries, struck, stats } = get()
    const item = SL_ITEM_BY_ID[itemId]
    if (!item || day < 0 || day > 6) return
    const week = [...(entries[itemId] ?? emptyWeek())]
    week[day] = hours
    const nextEntries = { ...entries, [itemId]: week }
    set({ entries: nextEntries })

    // One scare per crime per line: repeated edits don't re-alert.
    const total = rowTotal(nextEntries, itemId)
    if (item.tripwire && total > 0 && !struck[itemId]) {
      set({
        struck: { ...struck, [itemId]: true },
        stats: { ...stats, strikes: stats.strikes + 1 },
      })
      get().showCompliance('tripwire', COMPLIANCE_TRIPWIRE(item.code))
    } else if (item.remaining !== null && !item.tripwire && total > item.remaining + 1e-9 && !struck[itemId + ':over']) {
      set({
        struck: { ...struck, [itemId + ':over']: true },
        stats: { ...stats, strikes: stats.strikes + 1 },
      })
      get().showCompliance('overbook', COMPLIANCE_OVERBOOK(item.code, item.remaining))
    }
  },

  addToCard: itemId => {
    const { onCard, entries } = get()
    if (onCard.includes(itemId)) return
    // Insert in catalog order so the grid groups stay together.
    const order = Object.keys(SL_ITEM_BY_ID)
    const next = [...onCard, itemId].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    set({ onCard: next, entries: { ...entries, [itemId]: entries[itemId] ?? emptyWeek() } })
  },

  deliverEmail: (id, asInterrupt) => {
    const { inbox, clockMin } = get()
    set({
      inbox: inbox.some(e => e.id === id) ? inbox : [{ id, atMin: clockMin }, ...inbox],
      ...(asInterrupt ? { interrupt: { emailId: id, phase: 'reading' as const } } : {}),
    })
  },

  markRead: id => set(s => {
    if (s.read[id]) return {}
    // The reading pane says "a read receipt was sent on your behalf" — it was.
    // The sender now knows. (Doesn't count toward receiptsSent: you didn't
    // click Send, ClarityMail volunteered you.)
    const demandsReceipt = SL_EMAIL_BY_ID[id]?.receipt
    return {
      read: { ...s.read, [id]: true },
      receiptsFrom: demandsReceipt && !s.receiptsFrom.includes(id)
        ? [...s.receiptsFrom, id]
        : s.receiptsFrom,
      stats: { ...s.stats, emailsRead: s.stats.emailsRead + 1 },
    }
  }),

  dismissInterrupt: () => set(s => ({
    interrupt: null,
    stats: { ...s.stats, interruptionsClosed: s.stats.interruptionsClosed + 1 },
  })),

  demandReceipt: () => set(s => (s.interrupt ? { interrupt: { ...s.interrupt, phase: 'receipt' } } : {})),

  sendReceipt: () => set(s => {
    const emailId = s.interrupt?.emailId
    return {
      interrupt: null,
      receiptsFrom: emailId && !s.receiptsFrom.includes(emailId)
        ? [...s.receiptsFrom, emailId]
        : s.receiptsFrom,
      stats: {
        ...s.stats,
        receiptsSent: s.stats.receiptsSent + 1,
        interruptionsClosed: s.stats.interruptionsClosed + 1,
      },
    }
  }),

  notNow: () => set({ interrupt: null }),

  repromptReceipt: emailId => set({ interrupt: { emailId, phase: 'reprompt' } }),

  showCompliance: (title, body) => set({ compliance: { title, body } }),
  closeCompliance: () => set({ compliance: null }),

  offerUpdate: () => set({ updateOfferVisible: true }),
  answerUpdate: deferred => set({ updateOfferVisible: false, updateAnswered: true, updateDeferred: deferred }),
  setUpdateRunning: running => set({ updateRunning: running }),

  spawnChat: (senderId, senderName, senderTitle, text) => {
    const id = nextChatId++
    set(s => ({ chats: [...s.chats, { id, senderId, senderName, senderTitle, text, state: 'pinged' }] }))
    return id
  },

  replyChat: (id, reply) => set(s => ({
    chats: s.chats.map(c => (c.id === id ? { ...c, state: 'replied' as const, playerReply: reply } : c)),
  })),

  setChatState: (id, state) => set(s => ({
    chats: s.chats.map(c => (c.id === id ? { ...c, state } : c)),
  })),

  setOpenChat: id => set({ openChatId: id }),

  removeChat: id => set(s => ({
    chats: s.chats.filter(c => c.id !== id),
    openChatId: s.openChatId === id ? null : s.openChatId,
  })),

  hideUi: part => set(s => ({ hidden: { ...s.hidden, [part]: true } })),
  showUi: part => set(s => ({ hidden: { ...s.hidden, [part]: false } })),

  trySubmit: () => {
    const { entries, onCard, stats } = get()
    const err = validateTimesheet(entries, onCard)
    if (err) {
      set({ valError: err, stats: { ...stats, validationFails: stats.validationFails + 1 } })
    } else {
      set({ valError: null, attesting: true })
    }
  },

  clearValError: () => set({ valError: null }),
  cancelAttest: () => set({ attesting: false }),

  failAttest: msg => set(s => ({
    attesting: false,
    valError: msg,
    stats: { ...s.stats, validationFails: s.stats.validationFails + 1 },
  })),

  completeAttest: () => {
    set({ attesting: false, submitted: true })
    useGame.getState().slWin()
  },

  /** The server remembers a different number. Returns the affected line for the toast. */
  revertRandomCell: () => {
    const { entries, onCard } = get()
    const candidates: { id: string; day: number }[] = []
    for (const id of onCard) {
      const week = entries[id] ?? emptyWeek()
      for (const day of EDITABLE_DAYS) if (week[day] > 0) candidates.push({ id, day })
    }
    if (candidates.length === 0) return null
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    const week = [...entries[pick.id]]
    week[pick.day] = 0
    set({ entries: { ...entries, [pick.id]: week } })
    return { code: SL_ITEM_BY_ID[pick.id].code }
  },
}))

/** "2:47 PM" from minutes-since-midnight. */
export function fmtClock(min: number): string {
  const h24 = Math.floor(min / 60) % 24
  const m = min % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}
