import { test, expect } from '@playwright/test'
import { startGame, winViaTerminal } from './helpers'

/**
 * Writes a real row to the production Supabase database under the name "ZZZ"
 * and cannot delete it (the anon key has no delete grant — by design).
 * Runs locally only; skipped in CI. Prune old ZZZ rows occasionally via SQL.
 */
test.skip(Boolean(process.env.CI) || process.env.SKIP_DB === '1', 'DB-touching spec runs locally only')

test('score submits through the session-hash gauntlet and lands on the board', async ({ page }) => {
  await startGame(page, 'Home')
  // The validation trigger enforces ≥5s elapsed and activity ≥ seconds — a
  // 4-second robot win gets rejected as cheating (correctly!). Wiggle for
  // ~8s so the run clears the humanity floor with margin.
  for (let i = 0; i < 80; i++) {
    await page.mouse.move(200 + i * 5, 300 + (i % 7) * 10)
    await page.waitForTimeout(100)
  }
  await winViaTerminal(page)

  await page.fill('.lb-arcade-input', 'zzz') // lowercase on purpose: must uppercase
  await expect(page.locator('.lb-arcade-input')).toHaveValue('ZZZ')
  await page.click('.lb-form button')
  await expect(page.locator('.lb-rank')).toContainText('#', { timeout: 10_000 })
  await expect(page.locator('.lb-table')).toContainText('ZZZ')
  await expect(page.locator('.lb-me')).toBeVisible()
})
