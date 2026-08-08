import { create } from 'zustand'
import type { AdSpec, ErrorSpec } from '../content/types'
import type { ConfirmSpec } from '../content/confirms'
import { ADS } from '../content/ads'
import { CONFIRMS } from '../content/confirms'
import { ERROR_DIALOGS, BINDOWS_TIPS } from '../content/errors'
import { config } from './game'

export interface Popup {
  id: number
  kind: 'ad' | 'error' | 'confirm'
  ad?: AdSpec
  error?: ErrorSpec
  confirm?: ConfirmSpec
}

interface PopupStore {
  popups: Popup[]
  toasts: { id: number; text: string }[]
  bindowsTip: string | null
  updateOverlay: boolean
  /** Post-"upgrade" visual experience: garish colors + laggy cursor. */
  degraded: boolean
  /** Consequence states — triggered by choosing the destructive option on a
   * system prompt. See src/chaos/consequences.ts for the choreography. */
  bsod: boolean
  hung: boolean
  flickering: boolean
  hacked: boolean
  spawnAd: (adId?: string) => void
  spawnError: (error?: ErrorSpec) => void
  spawnConfirm: () => void
  closePopup: (id: number) => void
  toast: (text: string) => void
  /** No argument: a random OSXii tip. With text: the caller's own wisdom (Chrono™). */
  showBindows: (tip?: string) => void
  hideBindows: () => void
  showUpdate: () => void
}

let nextPopupId = 1
let nextToastId = 1
let bindowsTimer: ReturnType<typeof setTimeout> | null = null
let degradeTimer: ReturnType<typeof setTimeout> | null = null

export const usePopups = create<PopupStore>()((set, get) => ({
  popups: [],
  toasts: [],
  bindowsTip: null,
  updateOverlay: false,
  degraded: false,
  bsod: false,
  hung: false,
  flickering: false,
  hacked: false,

  spawnAd: adId => {
    const { popups } = get()
    const openAds = popups.filter(p => p.kind === 'ad')
    if (openAds.length >= 2) return
    const shown = new Set(openAds.map(p => p.ad!.id))
    const pool = adId ? ADS.filter(a => a.id === adId) : ADS.filter(a => !shown.has(a.id))
    if (pool.length === 0) return
    const ad = pool[Math.floor(Math.random() * pool.length)]
    set({ popups: [...popups, { id: nextPopupId++, kind: 'ad', ad }] })
  },

  spawnError: error => {
    const { popups } = get()
    if (popups.filter(p => p.kind === 'error').length >= 2) return
    const e = error ?? ERROR_DIALOGS[Math.floor(Math.random() * ERROR_DIALOGS.length)]
    set({ popups: [...popups, { id: nextPopupId++, kind: 'error', error: e }] })
  },

  spawnConfirm: () => {
    const { popups } = get()
    if (popups.some(p => p.kind === 'confirm')) return
    const c = CONFIRMS[Math.floor(Math.random() * CONFIRMS.length)]
    set({ popups: [...popups, { id: nextPopupId++, kind: 'confirm', confirm: c }] })
  },

  closePopup: id => set(s => ({ popups: s.popups.filter(p => p.id !== id) })),

  toast: text => {
    const id = nextToastId++
    set(s => ({ toasts: [...s.toasts.slice(-4), { id, text }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 5000)
  },

  showBindows: custom => {
    const tip = custom ?? BINDOWS_TIPS[Math.floor(Math.random() * BINDOWS_TIPS.length)]
    set({ bindowsTip: tip })
    if (bindowsTimer) clearTimeout(bindowsTimer)
    bindowsTimer = setTimeout(() => set({ bindowsTip: null }), 14000)
  },

  hideBindows: () => {
    if (bindowsTimer) clearTimeout(bindowsTimer)
    set({ bindowsTip: null })
  },

  showUpdate: () => {
    set({ updateOverlay: true })
    setTimeout(() => {
      set({ updateOverlay: false })
      const ms = config().degradeMs
      if (ms <= 0 || get().degraded) {
        get().toast('Update failed. Your files are safe. Probably.')
        return
      }
      // The upgrade "succeeded": things immediately get worse.
      set({ degraded: true })
      get().toast('✅ Update complete! Enjoy the new OSXii Visual Experience™ and Enhanced Cursor Physics™.')
      setTimeout(() => get().toast('🍔 Your menus have been streamlined into one convenient location.'), 2500)
      if (degradeTimer) clearTimeout(degradeTimer)
      degradeTimer = setTimeout(() => {
        set({ degraded: false })
        get().toast('Graphics driver recovered from the upgrade. We apologize for the improvement.')
      }, ms)
    }, 4000)
  },
}))
