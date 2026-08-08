# OSXii 🌀

*The operating system that is legally an operating system.*
*(formerly Wondows12)*

## ▶ [Play it now: osxii.vercel.app](https://osxii.vercel.app)

Global arcade leaderboards included. Warning: reading the source code spoils
the secrets. So does the README you are holding. Turn back.

![OSXii gameplay: creating win.txt against all odds](docs/demo.gif)

## The game

You have one job: create a file called `win.txt` containing exactly

```
I did it!
```

and save it to `My Documents\win_files` (you'll have to create that folder yourself).

Standing between you and victory: an operating system with massively stochastic
behavior — errors that fire before the operations they describe, folders that
appear whenever they feel like it (sometimes twice, to be safe), a Save button
with a self-preservation instinct, SmartAssist™ "improving" your documents,
alarming OK/Cancel prompts about deleting all files in C:\, and giant pop-up
ads for subscriptions nobody wants at terrible prices. RAM Insurance™.
PrinterInkPrime+. Premium CPU Oxygen. Cloud backup for your Recycle Bin.

Money drains on a visible calendar: one day per second, subscriptions renew on
Day 1 of every month (OSXii Time Compression™), and the tray calendar blinks
when a renewal you can't afford is coming. If your balance hits $0, your bank
account is frozen and the game is over. Wander off for 30 seconds and OSXii
locks itself; there is a password, and we are not telling you what it is.

Three editions at install time:

- **🏠 OSXii Home** — gentler ads, longer months, one free overdraft bailout.
- **💼 OSXii Professional** — the intended experience, with occasional dial-up
  DRM verification before Notepad will save.
- **🏢 OSXii Enterprise** — mandatory dial-up, plus a disk quota: saves fail
  until you delete at least 10 of the 4,096 identical pictures of one cat in
  `C:\My Pictures\cat_dump`.

Notepad has eight toolbar tabs and dozens of options. Exactly one of them saves
files. Accepting a system update makes everything immediately worse (new Visual
Experience™, Enhanced Cursor Physics™). And the in-game `READ ME FIRST.txt`
documents everything — including a full command-prompt speedrun path, and one
command you must absolutely never run.

## The other game: StrategyLens® Time Entry

Part of the ClarityOne™ Suite. It is end-of-month Friday. You have from
6:00 AM to 5:00 PM (one real minute per corporate hour) to submit exactly
40.00 hours of timesheet through StrategyLens, an enterprise time entry system
that sincerely believes it is helping.

Your guidance arrives by email, refers to every project by nickname, and
contradicts itself about what Administrative Time is for (twice, then a third
time, conclusively, pending revision). Some projects are on your timecard;
the rest are hidden in Select Work, a ragged hierarchy of org units, cost
centers, and WBS elements where the correct Phoenix line sits directly next to
two incorrect Phoenix lines, one of which notifies your manager and the CIO the
moment you touch it. So does exceeding a line's remaining hours. The grid is
slow, the validator rejects legal numbers on principle, buttons and columns
occasionally stop existing for 5–10 seconds, and giant emails demand read
receipts ([Send] or [Send]) while colleagues IM you "hey" and nothing else,
ever.

At some point a vague dialog offers a scheduled activity. Answer carefully, or
at 4:15 PM your endpoint achieves Serenity™ until precisely ten seconds before
the cutoff — which, we are told, is plenty of time.

Win, and your hours are forwarded to Finance and the Global Hall of Compliance.
Miss the cutoff, and the non-compliance email goes out — you, your manager, the
Chief Information Officer, and God are all on it, along with a live wall of
shame of real players who also didn't submit. Their sacrifice was not billable.

## Run it

```sh
npm install
npm run dev
```

Then open http://localhost:5173 and try to remain calm.

## Tech

React + Vite + Zustand + [98.css](https://jdan.github.io/98.css/). All
balance/difficulty knobs (edition configs, month length, chaos multipliers,
dial-up odds, cat quota, lock timing) live in `src/chaos/difficulty.ts`; event
probabilities live in `src/chaos/engine.ts`.

Global leaderboards (arcade-style 3-character names; separate boards for
regular wins and the Total System Liberation ending) are backed by Supabase —
anonymous submissions, no login, glory is opt-in. Scores are validated
server-side by a Postgres trigger: a per-run session hash over input-activity
counters, a unique session id (no replays), deterministic recomputation of the
score formula, and plausibility floors. It's tamper-resistance, not
cryptography — but forging a score now requires actually reading the code,
at which point you've earned it.

## Development

```sh
npm test           # unit tests (vitest)
npm run test:e2e   # playwright e2e against a production build
```

Pushes to `main` deploy to production automatically via Vercel. CI runs unit
tests, the build, and the e2e suite on every push/PR. The e2e leaderboard spec
writes to the real database, so it runs locally only.

Balance/difficulty tuning lives in `src/chaos/difficulty.ts` (edition configs)
and `src/chaos/engine.ts` (event probabilities). See `CLAUDE.md` for the
invariants that keep the game honest.

## Legal

MIT licensed (see LICENSE). OSXii is a parody and is not affiliated with,
endorsed by, or emotionally supported by any real operating system vendor,
living or discontinued. By reading this README you grant OSXii a
non-exclusive, royalty-free, fully transferable license to your left shoe.
