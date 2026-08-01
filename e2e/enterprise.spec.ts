import { test, expect } from '@playwright/test'
import { startGame, openTerminal } from './helpers'

/**
 * The full Enterprise gauntlet: buried save, dial-up DRM, disk quota, cats,
 * and the secret ending. This is the spec that exercises every hard mode
 * mechanic in one run.
 */
test('Enterprise: ribbon save → dial-up → disk full → cats → format c:', async ({ page }) => {
  await startGame(page, 'Enterprise')

  await expect(page.locator('.calendar')).toContainText('/24')
  await expect(page.locator('.balance')).toContainText('200.00')

  // Notepad: the real save is buried in Tools → Document Services
  await page.dblclick('.icon:has-text("Notepad")')
  await page.fill('.notepad-text', 'I did it!')
  await expect(page.locator('.ribbon-tabs .menu-btn')).toHaveCount(8)
  await page.click('.ribbon-tabs button:has-text("Tools")')
  await page.click('.ribbon-item:has-text("Document Services")')
  await page.click('.ribbon-sub button:has-text("Save As… (Legacy)")')
  await expect(page.locator('.save-dialog:not(.dialup)')).toBeVisible()
  await page.fill('.save-row input >> nth=1', 'win.txt')
  await page.locator('.save-actions button:has-text("Save")').first().click({ force: true })

  // Enterprise always dials up; ride it out (redialing if the line is busy)
  await expect(page.locator('.dialup')).toBeVisible({ timeout: 4_000 })
  for (let i = 0; i < 30 && (await page.locator('.dialup').isVisible().catch(() => false)); i++) {
    const redial = page.locator('.dialup button:has-text("Redial")')
    if (await redial.isVisible().catch(() => false)) await redial.click()
    await page.waitForTimeout(1_000)
  }

  // Disk full: the save must be blocked before any cats are deleted
  await page.waitForFunction(() => (window as any).__sawDiskFull, null, { timeout: 8_000 })

  // Explorer: delete 3 cats from the virtual dump
  await page.dblclick('.icon:has-text("My Computer")')
  const explorer = page.locator('.explorer').last()
  await explorer.locator('li:has-text("My Pictures")').dblclick()
  await explorer.locator('li:has-text("cat_dump")').dblclick()
  await expect(page.locator('.cat-tile').first()).toBeVisible()
  expect(await page.locator('.cat-tile').count()).toBeGreaterThanOrEqual(200)
  for (let i = 0; i < 3; i++) await page.locator('.cat-tile').nth(i).click()
  await page.click('button:has-text("Delete (3)")')
  await expect(page.locator('.explorer-status').last()).toContainText('3 deleted')

  // Terminal: delete 7 more, then take the secret exit
  const type = await openTerminal(page)
  await type('cd My Pictures\\cat_dump')
  for (let i = 0; i < 7; i++) await type('del *.jpg')
  await expect(page.locator('.terminal').last()).toContainText('Disk pressure: nominal')

  await type('format c:')
  await expect(page.locator('.terminal').last()).toContainText('Proceed with format? (Y/N)')
  await type('y')
  await expect(page.locator('.ultimate-screen')).toBeVisible({ timeout: 8_000 })
  await expect(page.locator('.ultimate-title')).toContainText('TOTAL SYSTEM LIBERATION')
})
