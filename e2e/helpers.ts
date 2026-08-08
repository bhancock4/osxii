import type { Page } from '@playwright/test'

/**
 * In-page auto-clicker that dismisses chaos popups (ads, errors, confirms)
 * the way a weary player would, so test clicks don't race the ad overlay.
 * Records dismissed Disk Manager errors on window.__sawDiskFull so specs can
 * assert the disk-full block happened without racing the dialog.
 */
export async function armAutoClicker(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as typeof window & { __sawDiskFull?: boolean }
    w.__sawDiskFull = false
    setInterval(() => {
      const err = document.querySelector('.error-dialog')
      if (err) {
        if (err.textContent?.includes('Disk Manager')) w.__sawDiskFull = true
        // Confirms: ALWAYS take the safe answer — the destructive one now has
        // real consequences (bsod, hacker takeover, ...) that would derail tests.
        const btn = err.querySelector<HTMLButtonElement>('.confirm-buttons button[data-safe="true"], .error-buttons button')
        if (btn) { btn.click(); return }
      }
      for (const sel of ['.ad-close-tiny', '.ad-close-corner', '.ad-nothanks']) {
        const b = document.querySelector<HTMLButtonElement>(sel)
        if (b) { b.click(); return }
      }
    }, 350)
  })
}

/** Boot → module picker → edition select → desktop, with the auto-clicker armed and README closed. */
export async function startGame(page: Page, edition: 'Home' | 'Professional' | 'Enterprise'): Promise<void> {
  await page.goto('/')
  await page.waitForSelector('.select-card', { timeout: 20_000 })
  await page.click('.select-option:has-text("OSXii Setup")')
  await page.click(`.select-option:has-text("${edition}")`)
  await page.waitForSelector('.taskbar', { timeout: 5_000 })
  await armAutoClicker(page)
  await page.click('.win .title-bar-controls button[aria-label="Close"]')
}

/** Open the Command Prompt and return a typed-command helper. */
export async function openTerminal(page: Page): Promise<(cmd: string) => Promise<void>> {
  await page.dblclick('.icon:has-text("Command Prompt")')
  const input = page.locator('.term-input-row input').last()
  return async (cmd: string) => {
    await input.fill(cmd)
    await input.press('Enter')
    await page.waitForTimeout(180)
  }
}

/** The canonical speedrun: create win.txt via the terminal. */
export async function winViaTerminal(page: Page): Promise<void> {
  const type = await openTerminal(page)
  await type('cd My Documents')
  await type('mkdir win_files')
  await type('cd win_files')
  await type('echo I did it! > win.txt')
  await page.waitForSelector('.victory-screen', { timeout: 5_000 })
}
