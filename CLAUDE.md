# OSXii (repo: osxii)

Satirical OS-desktop game. Live at https://osxii.vercel.app — push to `main` auto-deploys production via Vercel git integration.

## Commands

- `npm run dev` — dev server
- `npm test` — vitest unit tests (src/**/*.test.ts)
- `npm run test:e2e` — builds, then Playwright against vite preview. The leaderboard spec writes to the real Supabase DB (name ZZZ); it self-skips in CI and under `SKIP_DB=1`.
- `npm run record:demo` — demo GIF via Playwright + ffmpeg

## Invariants (violating these breaks things subtly)

- **Reload is the reset.** "Play Again" is `window.location.reload()`. Module-level state in `src/chaos/engine.ts` (intervals, listeners, sabotage budget, input counters) is never cleaned up and depends on this. Do not add in-place restart without redesigning engine.ts.
- **All balance tuning lives in `src/chaos/difficulty.ts`.** Never inline gameplay numbers elsewhere; Ben tunes this file directly.
- The win text `I did it!` and path `My Documents\win_files\win.txt` are load-bearing across game.ts, engine.ts (sabotage), content/readme.ts, and e2e specs.
- In `engine.ts` `tick()`, the ORDER of `pick()` calls is part of the probability tuning — one roll, accumulated thresholds.
- **Leaderboard submissions are validated by a Postgres trigger** (Supabase project `gcllbdvugejrrmrtyaqg`): 3-char A–Z0–9 names, unique `session_id`, sha256 session hash (salt in `src/leaderboard/client.ts` must match the trigger's canonical string EXACTLY), deterministic score recomputation, ≥5s runs, activity ≥ seconds. TWO score formulas are mirrored in the trigger: classic (`VictoryScreen.computeScore`, ending `won`) and StrategyLens (`SLVictoryScreen.computeSLScore`, ending `timesheet`, where the `subs` column holds compliance strikes and `ads_closed` holds interruptions closed). Change a formula in one place, change it in both. Endings `ultrawon` and `shamed` must have score 0.
- **StrategyLens module**: the win condition is `validateTimesheet` in `src/state/timesheet.ts` and it must stay satisfiable — buckets GEN-0002/GEN-0007 are uncapped on purpose so 40.00 is always reachable no matter which projects are preloaded. The module clock never pauses (deadlines don't); `slEngine.ts` has the same reload-only module-state invariant as `engine.ts`. StrategyLens rows submit difficulty `'eom'`; losses auto-publish to ending `'shamed'` (the wall of shame is a feature, not a leak).
- The supabase-js import is dynamic on purpose (halves initial bundle). Don't import it statically anywhere.

## Voice

Corporate-absurdist. The OS is never self-aware, never winks; it sincerely believes it is helping. Errors are cheerful, ads are predatory, legal text is a threat. Match `src/content/*` register when adding content.
