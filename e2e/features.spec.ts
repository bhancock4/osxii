import { test, expect } from '@playwright/test'
import { startGame, winViaTerminal } from './helpers'

test('Home: terminal speedrun reaches the victory screen', async ({ page }) => {
  await startGame(page, 'Home')
  await expect(page.locator('.balance')).toContainText('300.00')
  await expect(page.locator('.calendar')).toContainText('/45')
  await winViaTerminal(page)
  await expect(page.locator('.victory-screen')).toContainText('I DID IT!')
  // leaderboard form renders but we do NOT submit (that spec is DB-touching)
  await expect(page.locator('.lb-arcade-input')).toBeVisible()
})

test('update overlay degrades the desktop and lags the cursor', async ({ page }) => {
  await startGame(page, 'Home')
  await page.dblclick('.icon:has-text("Notepad")')
  await page.click('.ribbon-tabs button:has-text("Help")')
  await page.click('.ribbon-item:has-text("Check for Updates")')
  await expect(page.locator('.update-screen')).toBeVisible()
  await expect(page.locator('.desktop.degraded')).toBeVisible({ timeout: 8_000 })
  await expect(page.locator('.lag-cursor')).toBeVisible()
})

test('30s idle locks the screen; only "password" unlocks it', async ({ page }) => {
  await startGame(page, 'Home')
  await expect(page.locator('.lock-screen')).toBeVisible({ timeout: 45_000 })
  await page.fill('.lock-card input', 'hunter2')
  await page.press('.lock-card input', 'Enter')
  await expect(page.locator('.lock-msg')).toContainText('Incorrect')
  await page.fill('.lock-card input', 'password')
  await page.press('.lock-card input', 'Enter')
  await expect(page.locator('.lock-screen')).toHaveCount(0)
})

test('touch devices get the system-requirements gate', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.locator('.touchgate-screen')).toBeVisible()
  await page.tap('button:has-text("I have a mouse, I swear")')
  await page.tap('button:has-text("I solemnly swear")')
  await expect(page.locator('.boot-screen, .select-card').first()).toBeVisible({ timeout: 10_000 })
  await context.close()
})
