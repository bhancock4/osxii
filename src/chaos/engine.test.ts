import { describe, it, expect } from 'vitest'
import { maybeSabotageText } from './engine'

// Fairness invariants: chaos may misdirect, but only visibly, only against
// the winning text, and only a bounded number of times.
describe('SmartAssist™ sabotage invariants', () => {
  it('never touches non-winning text', () => {
    for (let i = 0; i < 200; i++) {
      const r = maybeSabotageText('dear diary, today an ad stole my focus')
      expect(r.sabotaged).toBe(false)
      expect(r.text).toBe('dear diary, today an ad stole my focus')
    }
  })

  it('sabotages the winning text at most twice, ever, and always visibly', () => {
    let sabotages = 0
    for (let i = 0; i < 500; i++) {
      const r = maybeSabotageText('I did it!')
      if (r.sabotaged) {
        sabotages++
        // a sabotaged result must actually differ (the player can catch it)
        expect(r.text).not.toBe('I did it!')
        // and must no longer satisfy the win condition
        expect(r.text.trimEnd()).not.toBe('I did it!')
      } else {
        expect(r.text).toBe('I did it!')
      }
    }
    expect(sabotages).toBeLessThanOrEqual(2)
  })

  it('lets the player through once the sabotage budget is spent', () => {
    // after the loop above, the cap is exhausted for this module instance
    for (let i = 0; i < 50; i++) {
      expect(maybeSabotageText('I did it!').sabotaged).toBe(false)
    }
  })
})
