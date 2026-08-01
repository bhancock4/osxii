import { defineConfig } from '@playwright/test'

/**
 * E2E suite. Runs against a production build via `vite preview`.
 * `npm run build` must run first (CI does; locally `npm run test:e2e` handles it).
 *
 * The leaderboard spec writes to the REAL Supabase database and cleans up
 * after itself — it is skipped in CI (no cleanup credentials there) and runs
 * locally by default. Set SKIP_DB=1 to skip it locally too.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // the game is a singleton per origin (localStorage, one preview server)
  use: {
    baseURL: process.env.TARGET_URL ?? 'http://localhost:4823',
    viewport: { width: 1100, height: 750 },
  },
  webServer: process.env.TARGET_URL
    ? undefined
    : {
        command: 'npx vite preview --port 4823 --strictPort',
        port: 4823,
        reuseExistingServer: !process.env.CI,
      },
})
