import { test, expect } from '@playwright/test'
import { startGame } from './helpers'

/**
 * Consequences are normally triggered by choosing the destructive option on a
 * random system prompt; window.OSXII.consequence() is the deliberate test
 * hook (and easter egg) that fires them on demand.
 */

test('bsod: blue screen collects a percentage, then any key dismisses', async ({ page }) => {
  await startGame(page, 'Home')
  await page.evaluate(() => window.OSXII!.consequence('bsod'))
  await expect(page.locator('.bsod-screen')).toBeVisible()
  await expect(page.locator('.bsod-continue')).toBeVisible({ timeout: 15_000 })
  await page.keyboard.press('Space')
  await expect(page.locator('.bsod-screen')).toHaveCount(0)
})

test('crash: the frontmost app dies with an illegal-operation error', async ({ page }) => {
  await startGame(page, 'Home')
  await page.dblclick('.icon:has-text("Notepad")')
  await expect(page.locator('.notepad')).toBeVisible()
  await page.evaluate(() => window.OSXII!.consequence('crash'))
  await expect(page.locator('.notepad')).toHaveCount(0)
  await expect(page.locator('.error-dialog')).toContainText('illegal operation')
})

test('hacker: pointer hijacked, subscriptions bought, taunts typed', async ({ page }) => {
  await startGame(page, 'Home')
  await page.evaluate(() => window.OSXII!.consequence('hacker'))
  await expect(page.locator('.hacker-cursor')).toBeVisible()
  await expect(page.locator('.hacker-blocker')).toBeVisible()
  // the hacker opens Notepad and types the taunt (textarea → assert via value)
  await expect(page.locator('.task-btn', { hasText: 'REMOTE' })).toBeVisible({ timeout: 8_000 })
  await expect
    .poll(async () => page.locator('.notepad-text').inputValue(), { timeout: 25_000 })
    .toContain('xX_TrustedPartner_Xx')
  // it spends real money: two subscriptions by the end
  await expect(page.locator('.tray')).toContainText('×2', { timeout: 20_000 })
  // control returns
  await expect(page.locator('.hacker-cursor')).toHaveCount(0, { timeout: 25_000 })
})

test('post-upgrade: ribbon collapses into a shuffled hamburger menu', async ({ page }) => {
  await startGame(page, 'Home')
  await page.evaluate(() => window.OSXII!.consequence('update'))
  await expect(page.locator('.desktop.degraded')).toBeVisible({ timeout: 10_000 })
  await page.dblclick('.icon:has-text("Notepad")')
  await expect(page.locator('.hamburger-btn')).toBeVisible()
  await expect(page.locator('.ribbon-tabs .menu-btn')).toHaveCount(1) // just ☰
  await page.click('.hamburger-btn')
  await expect(page.locator('.hamburger-menu button')).toHaveCount(8)
  await page.click('.hamburger-menu button:has-text("Tools")')
  await expect(page.locator('.ribbon-item:has-text("Document Services")')).toBeVisible()
})
