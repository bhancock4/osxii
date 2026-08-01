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
