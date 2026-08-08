import { describe, it, expect } from 'vitest'
import {
  validateTimesheet, weekTotal, rowTotal, pickPreloaded, emptyWeek, fmtClock,
  type Entries,
} from './timesheet'
import { REQUIRED_PROJECT_IDS, BUCKET_IDS, SL_ITEM_BY_ID, VAL_MSG } from '../content/strategylens'

const ALL_CARD = [...REQUIRED_PROJECT_IDS, ...BUCKET_IDS]

/** A timesheet the doctrine reluctantly accepts: 40.00h, all boxes ticked. */
function winningEntries(): Entries {
  const e: Entries = {}
  for (const id of ALL_CARD) e[id] = emptyWeek()
  // Guidance hours: phx 8, atlas 6, q3 4, sox 4, lake 6, brad 2 = 30
  e.phx = [0, 2, 2, 2, 2, 0, 0]
  e.atlas = [0, 2, 2, 1, 1, 0, 0]
  e.q3 = [0, 1, 1, 1, 1, 0, 0]
  e.sox = [0, 1, 1, 1, 1, 0, 0]
  e.lake = [0, 1, 2, 2, 1, 0, 0]
  e.brad = [0, 0, 0, 0, 2, 0, 0]
  // Buckets absorb the remainder: admin 0.5, pt 2, nwwt 7.5 = 10
  e.admin = [0, 0.5, 0, 0, 0, 0, 0]
  e.pt = [0, 0, 0, 0, 0, 2, 0]
  e.nwwt = [0, 1.5, 1.5, 2, 1.5, 1, 0]
  return e
}

describe('grid math', () => {
  it('totals rows and weeks', () => {
    const e = winningEntries()
    expect(rowTotal(e, 'phx')).toBe(8)
    expect(weekTotal(e)).toBeCloseTo(40, 9)
  })
})

describe('validateTimesheet', () => {
  it('accepts the winning configuration', () => {
    expect(validateTimesheet(winningEntries(), ALL_CARD)).toBeNull()
  })

  it('rejects weekend hours before anything else', () => {
    const e = winningEntries()
    e.phx[6] = 1
    expect(validateTimesheet(e, ALL_CARD)).toBe(VAL_MSG.weekend)
  })

  it('rejects non-quarter increments', () => {
    const e = winningEntries()
    e.phx[1] = 2.1
    expect(validateTimesheet(e, ALL_CARD)).toBe(VAL_MSG.increment('CAP-0091'))
  })

  it('rejects flagged (tripwire) items with any hours', () => {
    const e = winningEntries()
    const card = [...ALL_CARD, 'phx_trap']
    e.phx_trap = [0, 0.25, 0, 0, 0, 0, 0]
    expect(validateTimesheet(e, card)).toBe(VAL_MSG.flagged('CAP-0091a'))
  })

  it('rejects lines over their remaining hours', () => {
    const e = winningEntries()
    e.brad = [0, 2, 0, 0, 2, 0, 0] // Brad was allocated 2.0; this is 4.0
    expect(validateTimesheet(e, ALL_CARD)).toBe(VAL_MSG.overRemaining('OPX-0666'))
  })

  it('demands exactly 40.00 — under is missing', () => {
    const e = winningEntries()
    e.nwwt[1] = 1.25 // 39.75 total
    expect(validateTimesheet(e, ALL_CARD)).toBe(VAL_MSG.total(39.75))
  })

  it('demands exactly 40.00 — over is overtime requiring Form A_117L', () => {
    const e = winningEntries()
    e.nwwt[1] = 1.75 // 40.25 total
    expect(validateTimesheet(e, ALL_CARD)).toBe(VAL_MSG.overtime)
  })

  it('enforces the Administrative Time doctrine band', () => {
    const over = winningEntries()
    over.admin = [0, 0.75, 0, 0, 0, 0, 0]
    over.nwwt[1] = 1.25 // keep total at 40
    expect(validateTimesheet(over, ALL_CARD)).toBe(VAL_MSG.adminOver)

    const zero = winningEntries()
    zero.admin = emptyWeek()
    zero.nwwt[1] = 2 // keep total at 40
    expect(validateTimesheet(zero, ALL_CARD)).toBe(VAL_MSG.adminZero)
  })

  it('requires investing in yourself (GEN-0007)', () => {
    const e = winningEntries()
    e.nwwt[5] = e.nwwt[5] + 2
    e.pt = emptyWeek()
    expect(validateTimesheet(e, ALL_CARD)).toBe(VAL_MSG.ptZero)
  })

  it('requires every guidance project — including ones not on the card', () => {
    const e = winningEntries()
    const card = ALL_CARD.filter(id => id !== 'lake')
    delete e.lake
    e.nwwt = [0, 3, 3, 3, 2.5, 2, 0] // re-balance to 40
    expect(validateTimesheet(e, card)).toBe(VAL_MSG.missing('CAP-1808'))
  })
})

describe('pickPreloaded', () => {
  it('picks the requested number of distinct required projects in catalog order', () => {
    const picked = pickPreloaded(3, () => 0.99)
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
    for (const id of picked) expect(REQUIRED_PROJECT_IDS).toContain(id)
    const idx = picked.map(id => REQUIRED_PROJECT_IDS.indexOf(id))
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })
})

describe('fmtClock', () => {
  it('formats the corporate day', () => {
    expect(fmtClock(6 * 60)).toBe('6:00 AM')
    expect(fmtClock(12 * 60)).toBe('12:00 PM')
    expect(fmtClock(16 * 60 + 15)).toBe('4:15 PM')
    expect(fmtClock(17 * 60)).toBe('5:00 PM')
  })
})

describe('work item catalog sanity', () => {
  it('the winning configuration is actually reachable within remaining hours', () => {
    // Guidance hours must fit under each project's remaining allocation.
    const e = winningEntries()
    for (const id of REQUIRED_PROJECT_IDS) {
      const item = SL_ITEM_BY_ID[id]
      expect(rowTotal(e, id)).toBeLessThanOrEqual(item.remaining ?? Infinity)
    }
  })
})
