/**
 * OSXii difficulty tuning. Every knob the chaos engine, economy, and apps
 * consult lives here — tweak freely, nothing else needs to change.
 *
 * A calendar "day" ticks once per second (see DAY_MS), so a billing month of
 * 32 days ≈ 32 real seconds between subscription renewals.
 */

export type Difficulty = 'home' | 'pro' | 'enterprise'

/** Real milliseconds per calendar day shown in the tray. */
export const DAY_MS = 1000

export interface DifficultyConfig {
  key: Difficulty
  label: string
  icon: string
  blurb: string

  /** Starting bank balance. */
  startBalance: number
  /** Calendar days per billing month; renewals charge when the month wraps to Day 1. */
  monthDays: number
  /** Quiet period after install before the chaos engine wakes up. */
  graceMs: number
  /** Global multiplier on random chaos event rates. */
  chaosMul: number
  /** One free bailout: a renewal that would bankrupt you leaves $9.99 instead. */
  overdraftGrace: boolean
  /** Chance the Save button dodges the cursor on hover. */
  saveDodgeChance: number
  /** Max number of times SmartAssist™ may "improve" the winning text. */
  sabotageMax: number
  /** Chance a Notepad save requires a DRM dial-up connection first. */
  dialUpChance: number
  /** Chance the dial-up handshake fails with LINE BUSY (retry required). */
  dialUpFailChance: number
  /** Saves fail with DISK FULL until enough cat pictures are deleted. */
  catBlocker: boolean
  /** How many cat pictures must be deleted to free the disk. */
  catsRequired: number
  /** How long the post-update visual "upgrade" (garish theme + laggy mouse) lasts. */
  degradeMs: number
  /** Idle time before the lock screen engages. */
  lockIdleMs: number
  /** Idle time after which the engine biases toward clearable annoyances. */
  idleNagMs: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  home: {
    key: 'home',
    label: 'OSXii Home',
    icon: '🏠',
    blurb: 'For casual sufferers. Gentler ads, longer months, one free overdraft bailout.',
    startBalance: 300,
    monthDays: 45,
    graceMs: 20000,
    chaosMul: 0.7,
    overdraftGrace: true,
    saveDodgeChance: 0.15,
    sabotageMax: 1,
    dialUpChance: 0,
    dialUpFailChance: 0,
    catBlocker: false,
    catsRequired: 10,
    degradeMs: 25000,
    lockIdleMs: 30000,
    idleNagMs: 12000,
  },
  pro: {
    key: 'pro',
    label: 'OSXii Professional',
    icon: '💼',
    blurb: 'The intended experience. Ads at full strength, occasional DRM dial-up.',
    startBalance: 250,
    monthDays: 32,
    graceMs: 15000,
    chaosMul: 1,
    overdraftGrace: false,
    saveDodgeChance: 0.3,
    sabotageMax: 2,
    dialUpChance: 0.35,
    dialUpFailChance: 0.25,
    catBlocker: false,
    catsRequired: 10,
    degradeMs: 45000,
    lockIdleMs: 30000,
    idleNagMs: 12000,
  },
  enterprise: {
    key: 'enterprise',
    label: 'OSXii Enterprise',
    icon: '🏢',
    blurb: 'For IT departments. Mandatory dial-up DRM, disk quotas, cats. Good luck.',
    startBalance: 200,
    monthDays: 24,
    graceMs: 10000,
    chaosMul: 1.35,
    overdraftGrace: false,
    saveDodgeChance: 0.45,
    sabotageMax: 3,
    dialUpChance: 1,
    dialUpFailChance: 0.5,
    catBlocker: true,
    catsRequired: 10,
    degradeMs: 75000,
    lockIdleMs: 30000,
    idleNagMs: 10000,
  },
}

/** Total files in C:\My Pictures\cat_dump. They are all the same cat. */
export const CAT_TOTAL = 4096

// ---------------------------------------------------------------------------
// StrategyLens® Time Entry (part of the ClarityOne™ Suite) — module tuning.
// The workday runs on a game clock: 1 game minute per GAME_MIN_MS real ms.
// At the default (1000ms), the 6:00 AM → 5:00 PM day lasts 11 real minutes.
// ---------------------------------------------------------------------------

export interface SLConfig {
  /** Real ms per in-game minute. 1000 = one game hour per real minute. */
  gameMinMs: number
  /** Workday start, minutes since midnight (6:00 AM). */
  startMin: number
  /** Submission cutoff, minutes since midnight (5:00 PM). */
  deadlineMin: number

  /** Window (game minutes) in which the vague update dialog appears. */
  updateOfferMin: [number, number]
  /** When the scheduled update fires if not explicitly deferred (4:15 PM). */
  updateFireMin: number
  /** The update releases the machine this many REAL ms before the cutoff. Hope. */
  updateHopeRealMs: number

  /** Chance a StrategyLens launch simply fails. */
  launchFailChance: number
  /** Fake loading splash duration range (real ms) when the app does launch. */
  loadMs: [number, number]

  /** Gap between UI-vanish events (real ms). */
  vanishGapMs: [number, number]
  /** How long a vanished element stays gone (real ms). Spec: 5–10s. */
  vanishDurMs: [number, number]

  /** Per-keystroke commit lag inside grid cells (real ms). */
  cellLagMs: [number, number]
  /** Chance a legal cell commit is rejected with a nonsense validation error. */
  cellRejectChance: number
  /** Chance a committed cell silently reverts to "the server value" later. */
  cellRevertChance: number

  /** Gap between giant interrupt emails (real ms). */
  emailGapMs: [number, number]
  /** Fraction of interrupt emails demanding a read receipt (spec: ≥ 0.5). */
  readReceiptRate: number
  /** Chance the read-receipt dialog offers a useless [Not Now] button. */
  notNowChance: number
  /** [Not Now] re-asks after this long. It is now. */
  notNowRepromptMs: number

  /** Gap between salutation-only chat pings (real ms). */
  chatGapMs: [number, number]
  /** After a reply, the sender goes Away forever; some eventually say this. */
  chatNvmMs: [number, number]
  /** Chance a ghosted sender sends the "nvm got it" coda at all. */
  chatNvmChance: number

  /** Gap between Chrono™ coaching visits (real ms). */
  chronoGapMs: [number, number]
  /** Gap between corporate toasts (real ms). */
  toastGapMs: [number, number]
  /** Gap between random StrategyLens error dialogs (real ms). */
  errorGapMs: [number, number]

  /** How many of the six required projects start on the timecard. */
  preloadedProjects: number

  /** GEN-0001 Administrative Time: the validator's actual doctrine band. */
  adminMin: number
  adminMax: number
  /** Weekly total the validator will accept. Exactly. */
  weekTotal: number
}

export const SL: SLConfig = {
  gameMinMs: 1000,
  startMin: 6 * 60,
  deadlineMin: 17 * 60,

  updateOfferMin: [9 * 60, 11 * 60],
  updateFireMin: 16 * 60 + 15,
  updateHopeRealMs: 10000,

  launchFailChance: 0.3,
  loadMs: [1800, 4200],

  vanishGapMs: [14000, 28000],
  vanishDurMs: [5000, 10000],

  cellLagMs: [200, 900],
  cellRejectChance: 0.12,
  cellRevertChance: 0.05,

  emailGapMs: [24000, 45000],
  readReceiptRate: 0.6,
  notNowChance: 0.4,
  notNowRepromptMs: 30000,

  chatGapMs: [40000, 80000],
  chatNvmMs: [90000, 180000],
  chatNvmChance: 0.5,

  chronoGapMs: [35000, 70000],
  toastGapMs: [20000, 40000],
  errorGapMs: [30000, 60000],

  preloadedProjects: 3,

  adminMin: 0.25,
  adminMax: 0.5,
  weekTotal: 40,
}
