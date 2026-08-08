import { test, expect, type Page } from '@playwright/test'
import { armAutoClicker } from './helpers'

/**
 * StrategyLens® Time Entry module. These specs stay inside the first ~20s of
 * the workday so the slower nuisances (interrupt emails at 24s+, UI vanishes
 * at 14s+) mostly can't race them; the auto-clicker soaks up launch failures
 * and random validation errors.
 */

async function clockIn(page: Page, name = 'EEE'): Promise<void> {
  await page.goto('/')
  await page.waitForSelector('.select-card', { timeout: 20_000 })
  await page.click('.select-option:has-text("StrategyLens")')
  await page.fill('.lb-arcade-input', name)
  await page.click('.sl-clockin')
  await page.waitForSelector('.taskbar', { timeout: 5_000 })
  await armAutoClicker(page)
}

/** Launching StrategyLens sometimes just fails, by design. Persist. */
async function openStrategyLens(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt++) {
    await page.dblclick('.icon:has-text("StrategyLens")')
    try {
      await page.waitForSelector('.sl-app', { timeout: 2_500 })
      // Past the loading splash → the real app (footer present).
      await page.waitForSelector('.sl-footer', { timeout: 10_000 })
      return
    } catch { /* licensing conflict SL-1017; the auto-clicker clears it — retry */ }
  }
  throw new Error('StrategyLens never launched. Too realistic.')
}

test('module picker offers both games and the classic path still exists', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.select-card', { timeout: 20_000 })
  await expect(page.locator('.select-option:has-text("OSXii Setup")')).toBeVisible()
  await expect(page.locator('.select-option:has-text("StrategyLens")')).toBeVisible()
  await page.click('.select-option:has-text("OSXii Setup")')
  await expect(page.locator('.select-option:has-text("Professional")')).toBeVisible()
  await page.click('.select-back')
  await expect(page.locator('.select-option:has-text("StrategyLens")')).toBeVisible()
})

test('clocking in demands a name, starts the day at 6:00 AM, and delivers the mail', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.select-card', { timeout: 20_000 })
  await page.click('.select-option:has-text("StrategyLens")')
  await expect(page.locator('.sl-clockin')).toBeDisabled()
  await page.fill('.lb-arcade-input', 'EEE')
  await expect(page.locator('.sl-clockin')).toBeEnabled()
  await page.click('.sl-clockin')

  // Corporate tray: the countdown, not a bank balance.
  await expect(page.locator('.tray')).toContainText('to cutoff')
  await expect(page.locator('.tray')).toContainText('AM')

  // ClarityMail auto-opens with the overnight dread.
  await page.waitForSelector('.mail-app', { timeout: 5_000 })
  await expect(page.locator('.mail-row', { hasText: 'ACTION REQUIRED' })).toBeVisible()
  await page.click('.mail-row:has-text("your allocations")')
  await expect(page.locator('.mail-body')).toContainText('Phoenix')
  await expect(page.locator('.mail-body')).toContainText('Attachment failed to attach')
})

test('the grid loads, an empty timesheet is rejected, and Select Work reveals the hierarchy', async ({ page }) => {
  await clockIn(page)
  await openStrategyLens(page)

  // Nine-ish rows: preloaded projects + the three standard buckets.
  await expect(page.locator('.sl-grid')).toBeVisible()
  await expect(page.locator('.sl-grid')).toContainText('GEN-0007 · Personal Transformation')

  // Submitting 0.00 of 40.00 hours: the validator has notes.
  const submit = page.locator('.sl-submit')
  await submit.waitFor({ state: 'visible', timeout: 15_000 })
  await submit.click()
  await expect(page.locator('.sl-valerror')).toContainText('40.00')

  // Select Work: the tree exists and is technically navigable.
  const selectWork = page.locator('.sl-selectwork')
  await selectWork.waitFor({ state: 'visible', timeout: 15_000 })
  await selectWork.click()
  await expect(page.locator('.sl-modal-box')).toContainText('Org Unit 10 — NA-CORP')
  await page.click('.sl-modal-actions button:has-text("Done")')
  await expect(page.locator('.sl-modal')).toHaveCount(0)
})
