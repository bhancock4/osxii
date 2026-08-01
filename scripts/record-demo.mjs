// Records the demo GIF footage: a scripted playthrough against a running dev
// server (npm run dev), captured headlessly with Playwright.
//
//   npm run record:demo
//   ffmpeg -y -i scripts/video/*.webm \
//     -vf "setpts=PTS/1.6,fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
//     -loop 0 docs/demo.gif
//
// Note the force:true clicks — the ads' CSS animations never "stabilize", so
// Playwright refuses to click them politely. The game defeats robots too.
import { chromium } from 'playwright'

const OUT_DIR = new URL('./video/', import.meta.url).pathname
const URL_UNDER_TEST = process.env.GAME_URL ?? 'http://localhost:5173/'

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1024, height: 640 },
  recordVideo: { dir: OUT_DIR, size: { width: 1024, height: 640 } },
})
const page = await context.newPage()
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function dismissPopups() {
  for (let i = 0; i < 12; i++) {
    if (!(await page.locator('.ad-overlay').isVisible().catch(() => false))) return
    const closers = [
      '.ad-close-tiny', '.ad-close-corner', '.ad-nothanks',
      '.confirm-buttons button[data-safe="true"]',
      '.error-buttons button',
    ]
    let clicked = false
    for (const sel of closers) {
      const el = page.locator(sel).first()
      if (await el.isVisible().catch(() => false)) {
        await el.click({ force: true }).catch(() => {})
        clicked = true
        await sleep(400)
        break
      }
    }
    if (!clicked) {
      // probably a delayed-close ad counting down — wait it out
      await sleep(1100)
      if (i >= 7) {
        // fine, HAVE my money
        await page.locator('.cta').first().click({ force: true, timeout: 2000 }).catch(() => {})
        await sleep(500)
      }
    }
  }
}

async function ensureTerminal() {
  await dismissPopups()
  const input = page.locator('.term-input-row input')
  if (!(await input.isVisible().catch(() => false))) {
    await page.locator('.task-btn', { hasText: 'cmd.exe' }).first().click({ force: true }).catch(() => {})
    await sleep(300)
  }
  await page.locator('.terminal').click({ force: true }).catch(() => {})
  await input.focus().catch(() => {})
}

async function cmd(text, pauseAfter = 900) {
  await ensureTerminal()
  await page.keyboard.type(text, { delay: 65 })
  await sleep(250)
  await page.keyboard.press('Enter')
  await sleep(pauseAfter)
}

console.log('navigating...')
await page.goto(URL_UNDER_TEST)

// boot screen plays out, then choose an edition (admire the leaderboard first)
await page.waitForSelector('.select-card', { timeout: 20000 })
await sleep(2200)
await page.locator('.select-option', { hasText: 'Professional' }).click()
await page.waitForSelector('.desktop', { timeout: 20000 })
console.log('desktop up, admiring README...')
await sleep(3200)

// drag the README window to the right so the desktop is visible
const readmeBar = page.locator('.title-bar', { hasText: 'READ ME' }).first()
if (await readmeBar.isVisible().catch(() => false)) {
  const box = await readmeBar.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(730, 120, { steps: 12 })
    await page.mouse.up()
  }
}
await sleep(600)

// GUI act: open My Computer, go into My Documents, create win_files
console.log('explorer act...')
await page.locator('.icon', { hasText: 'My Computer' }).dblclick()
await sleep(900)
await dismissPopups()
await page.locator('.explorer-list li', { hasText: 'My Documents' }).dblclick()
await sleep(700)
await page.locator('.explorer-newname').fill('win_files')
await sleep(400)
await page.locator('.explorer-toolbar button', { hasText: 'Create' }).click()
console.log('waiting out chaotic folder creation...')
await sleep(6500) // chaos delay: folder appears whenever it feels like it
await dismissPopups()

// Terminal act
console.log('terminal act...')
await page.locator('.icon', { hasText: 'Command Prompt' }).dblclick()
await sleep(1000)
await cmd('cd My Documents')
await cmd('dir')
await cmd('whoami', 700)
await cmd('type win.txt', 700) // does not exist yet; the system enjoys saying so
await cmd('mkdir win_files', 700) // insurance in case Explorer's async chaos ate the folder
await cmd('cd win_files', 700)
await cmd('help', 600)
await cmd('cls', 500)
await cmd('dir', 1200) // 9th command → guaranteed ad

// an ad should be up — fall for the giant button on purpose
await sleep(1400)
const cta = page.locator('.cta').first()
if (await cta.isVisible().catch(() => false)) {
  console.log('subscribing to something terrible...')
  await cta.click({ force: true, timeout: 5000 }).catch(() => {})
  await sleep(1600)
}
await dismissPopups()

// the winning move
console.log('winning...')
await cmd('echo I did it! > win.txt', 500)
await page.waitForSelector('.victory-screen', { timeout: 8000 }).catch(() => console.log('no victory?!'))
await sleep(3800)

await context.close()
await browser.close()
console.log('done — footage in scripts/video/')
