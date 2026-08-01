import { useGame } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { ADS } from '../content/ads'
import { markActivity } from './engine'

/**
 * Real punishments for choosing the destructive option on a system prompt.
 * Every consequence is recoverable — the run stays technically winnable, per
 * the lawyers — but the hacker takeover spends actual money, which is the
 * point. All timers no-op safely if the game ends mid-sequence (buySub and
 * friends guard on status internally).
 */
export type ConsequenceKind = 'bsod' | 'crash' | 'hang' | 'flicker' | 'hacker' | 'update' | 'adstorm'

const TAUNT = [
  'hey. nice operating system.',
  "we're in your files. tax_stuff_2019 is empty. disappointing.",
  "we read definitely_not_passwords.txt. 'hunter2'. bold.",
  'we subscribed you to some things. you deserve them.',
  "don't bother closing this window. we have others.",
  '',
  '- xX_TrustedPartner_Xx',
].join('\n')

function bsod() {
  usePopups.setState({ bsod: true })
}

/** The frontmost window "performs an illegal operation" and dies. */
function crash() {
  const { wins } = useWins.getState()
  const open = wins.filter(w => !w.minimized)
  if (open.length === 0) {
    usePopups.getState().spawnError({
      title: 'OSXii',
      body: 'Nothing was open to crash. A crash has been scheduled for a worse time.',
      button: 'Cool',
    })
    return
  }
  const victim = open.reduce((a, b) => (a.z > b.z ? a : b))
  useWins.getState().close(victim.id)
  usePopups.getState().spawnError({
    title: victim.title,
    body: `${victim.title} has performed an illegal operation and has been shut down. Any unsaved work has been donated.`,
    button: 'It was legal',
  })
}

function hang() {
  usePopups.setState({ hung: true })
  setTimeout(() => {
    usePopups.setState({ hung: false })
    markActivity() // blocked input isn't idleness; don't let the lock screen pounce
    usePopups.getState().spawnError({
      title: 'OSXii',
      body: 'OSXii has recovered from not responding. It remains unresponsive emotionally.',
      button: 'Understood??',
    })
  }, 7000)
}

function flicker() {
  usePopups.setState({ flickering: true })
  setTimeout(() => usePopups.setState({ flickering: false }), 2200)
}

/**
 * Remote Assistance™: a hacker cursor takes the pointer, subscribes to things
 * with your money, and opens Notepad to taunt you — all while your input is
 * blocked. ~16 seconds of helplessness.
 */
function hacker() {
  const pop = usePopups.getState()
  usePopups.setState({ hacked: true })
  pop.toast('⚠️ Remote Assistance session started. You agreed to this. Literally just now.')

  const targets = ADS.filter(a => !['wondows-pro'].includes(a.id))
  const pickAd = () => targets[Math.floor(Math.random() * targets.length)]

  const subscribeTo = (delayMs: number) => {
    const ad = pickAd()
    setTimeout(() => usePopups.getState().spawnAd(ad.id), delayMs)
    setTimeout(() => {
      const shown = usePopups.getState().popups.find(p => p.kind === 'ad' && p.ad?.id === ad.id)
      if (shown) usePopups.getState().closePopup(shown.id)
      useGame.getState().buySub(ad.productName, ad.monthlyCost)
      usePopups.getState().toast(`🎉 Subscribed to ${ad.productName}! (Not you. Them. For you.)`)
    }, delayMs + 2000)
  }

  subscribeTo(1200)
  subscribeTo(9500)
  setTimeout(() => useWins.getState().open('notepad', { autoType: TAUNT }, 'REMOTE - Notepad'), 4200)
  // Control returns only after the taunt finishes typing (~13s at 48ms/char).
  setTimeout(() => {
    usePopups.setState({ hacked: false })
    markActivity() // blocked input isn't idleness; don't let the lock screen pounce
    usePopups.getState().toast('Remote Assistance session ended. Please rate your hacker: ⭐⭐⭐⭐⭐')
  }, 18500)
}

function adstorm() {
  const pop = usePopups.getState()
  pop.spawnAd()
  setTimeout(() => usePopups.getState().spawnAd(), 700)
  pop.toast('You have been added to 47 mailing lists and one physical mailing route.')
}

export function applyConsequence(kind: ConsequenceKind): void {
  switch (kind) {
    case 'bsod': return bsod()
    case 'crash': return crash()
    case 'hang': return hang()
    case 'flicker': return flicker()
    case 'hacker': return hacker()
    case 'update': return usePopups.getState().showUpdate()
    case 'adstorm': return adstorm()
  }
}

// Deliberate easter egg AND the e2e test hook: window.OSXII.consequence('bsod').
// Client-side game, nothing to protect — anyone summoning their own hacker
// has simply found the speedrun for regret.
declare global {
  interface Window { OSXII?: { consequence: (kind: ConsequenceKind) => void } }
}
if (typeof window !== 'undefined') {
  window.OSXII = { consequence: applyConsequence }
}
