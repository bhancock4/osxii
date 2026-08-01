# OSXii 🌀

*The operating system that is legally an operating system.*
*(formerly Wondows12)*

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

Global leaderboards (per edition, separate boards for regular wins and the
Total System Liberation ending) are backed by Supabase — anonymous name-entry
submissions, RLS + CHECK constraints on the `scores` table, client in
`src/leaderboard/`. No login required; glory is opt-in.

## Legal

OSXii is a parody and is not affiliated with, endorsed by, or emotionally
supported by any real operating system vendor, living or discontinued. By
reading this README you grant OSXii a non-exclusive, royalty-free,
fully transferable license to your left shoe.
