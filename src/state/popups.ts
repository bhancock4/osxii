import { create } from 'zustand'
import type { AdSpec, ErrorSpec } from '../content/types'
import { ADS } from '../content/ads'
import { ERROR_DIALOGS, BINDOWS_TIPS } from '../content/errors'

export interface Popup {
  id: number
  kind: 'ad' | 'error'
  ad?: AdSpec
  error?: ErrorSpec
}

interface PopupStore {
  popups: Popup[]
  toasts: { id: number; text: string }[]
  bindowsTip: string | null
  updateOverlay: boolean
  spawnAd: (adId?: string) => void
  spawnError: (error?: ErrorSpec) => void
  closePopup: (id: number) => void
  toast: (text: string) => void
  showBindows: () => void
  hideBindows: () => void
  showUpdate: () => void
}

let nextPopupId = 1
let nextToastId = 1
let bindowsTimer: ReturnType<typeof setTimeout> | null = null

export const usePopups = create<PopupStore>()((set, get) => ({
  popups: [],
  toasts: [],
  bindowsTip: null,
  updateOverlay: false,

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

  closePopup: id => set(s => ({ popups: s.popups.filter(p => p.id !== id) })),

  toast: text => {
    const id = nextToastId++
    set(s => ({ toasts: [...s.toasts.slice(-4), { id, text }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 5000)
  },

  showBindows: () => {
    const tip = BINDOWS_TIPS[Math.floor(Math.random() * BINDOWS_TIPS.length)]
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
      get().toast('Update failed. Your files are safe. Probably.')
    }, 4000)
  },
}))
