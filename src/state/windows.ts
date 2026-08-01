import { create } from 'zustand'

export type AppType = 'notepad' | 'explorer' | 'terminal' | 'readme'

export interface Win {
  id: number
  app: AppType
  title: string
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  props?: Record<string, unknown>
}

const DEFAULTS: Record<AppType, { title: string; w: number; h: number }> = {
  notepad: { title: 'Untitled - Notepad', w: 480, h: 380 },
  explorer: { title: 'My Computer', w: 540, h: 400 },
  terminal: { title: 'C:\\OSXII\\cmd.exe', w: 580, h: 360 },
  readme: { title: 'READ ME FIRST.txt - Notepad', w: 520, h: 440 },
}

interface WinStore {
  wins: Win[]
  nextId: number
  nextZ: number
  open: (app: AppType, props?: Record<string, unknown>, title?: string) => void
  close: (id: number) => void
  focus: (id: number) => void
  minimize: (id: number) => void
  restore: (id: number) => void
  move: (id: number, x: number, y: number) => void
  setTitle: (id: number, title: string) => void
  minimizeRandom: () => boolean
}

export const useWins = create<WinStore>()((set, get) => ({
  wins: [],
  nextId: 1,
  nextZ: 10,

  open: (app, props, title) => {
    const { nextId, nextZ, wins } = get()
    const d = DEFAULTS[app]
    const margin = 40 + ((nextId * 28) % 160)
    const w = Math.min(d.w, window.innerWidth - 20)
    const h = Math.min(d.h, window.innerHeight - 60)
    const win: Win = {
      id: nextId,
      app,
      title: title ?? d.title,
      x: Math.max(4, Math.min(margin + 80, window.innerWidth - w - 8)),
      y: Math.max(4, Math.min(margin, window.innerHeight - h - 50)),
      w, h,
      z: nextZ,
      minimized: false,
      props,
    }
    set({ wins: [...wins, win], nextId: nextId + 1, nextZ: nextZ + 1 })
  },

  close: id => set(s => ({ wins: s.wins.filter(w => w.id !== id) })),

  focus: id => set(s => ({
    nextZ: s.nextZ + 1,
    wins: s.wins.map(w => (w.id === id ? { ...w, z: s.nextZ, minimized: false } : w)),
  })),

  minimize: id => set(s => ({ wins: s.wins.map(w => (w.id === id ? { ...w, minimized: true } : w)) })),

  restore: id => get().focus(id),

  move: (id, x, y) => set(s => ({ wins: s.wins.map(w => (w.id === id ? { ...w, x, y } : w)) })),

  setTitle: (id, title) => set(s => ({ wins: s.wins.map(w => (w.id === id ? { ...w, title } : w)) })),

  minimizeRandom: () => {
    const candidates = get().wins.filter(w => !w.minimized)
    if (candidates.length === 0) return false
    const victim = candidates[Math.floor(Math.random() * candidates.length)]
    get().minimize(victim.id)
    return true
  },
}))
