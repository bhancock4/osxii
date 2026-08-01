import { create } from 'zustand'
import { DIFFICULTIES, CAT_TOTAL, type Difficulty, type DifficultyConfig } from '../chaos/difficulty'

export interface FolderNode { type: 'folder'; children: Record<string, FSNode> }
export interface FileNode { type: 'file'; content: string }
export type FSNode = FolderNode | FileNode

export const folder = (children: Record<string, FSNode> = {}): FolderNode => ({ type: 'folder', children })
export const file = (content: string): FileNode => ({ type: 'file', content })

/** Path of the virtual folder containing several thousand copies of one cat. */
export const CAT_PATH = ['My Pictures', 'cat_dump']

export function initialRoot(): FolderNode {
  return folder({
    'My Documents': folder({
      'tax_stuff_2019': folder({}),
      'definitely_not_passwords.txt': file('hunter2\nhunter3 (backup)\n'),
    }),
    'My Pictures': folder({
      'cat_dump': folder({}),
    }),
    'Program Files': folder({
      'OSXii Defender (trial expired)': folder({}),
    }),
  })
}

export function getNode(root: FolderNode, path: string[]): FSNode | null {
  let node: FSNode = root
  for (const seg of path) {
    if (node.type !== 'folder') return null
    const next: FSNode | undefined = node.children[seg]
    if (!next) return null
    node = next
  }
  return node
}

/** Case-insensitive child lookup (it's OSXii, after all) */
export function resolveChild(node: FolderNode, name: string): string | null {
  if (node.children[name]) return name
  const lower = name.toLowerCase()
  for (const key of Object.keys(node.children)) {
    if (key.toLowerCase() === lower) return key
  }
  return null
}

/** Case-insensitive path resolution — returns the canonical path or null */
export function resolvePath(root: FolderNode, path: string[]): string[] | null {
  const out: string[] = []
  let node: FSNode = root
  for (const seg of path) {
    if (node.type !== 'folder') return null
    const key = resolveChild(node, seg)
    if (!key) return null
    out.push(key)
    node = node.children[key]
  }
  return out
}

export function isCatPath(path: string[]): boolean {
  return path.length === CAT_PATH.length && path.every((s, i) => s.toLowerCase() === CAT_PATH[i].toLowerCase())
}

export function catName(id: number): string {
  return `cat_${String(id).padStart(4, '0')}.jpg`
}

function isWin(root: FolderNode): boolean {
  const n = getNode(root, ['My Documents', 'win_files', 'win.txt'])
  return !!n && n.type === 'file' && n.content.trimEnd() === 'I did it!'
}

export interface Subscription { name: string; price: number }

export type GameStatus = 'boot' | 'select' | 'playing' | 'won' | 'ultrawon' | 'frozen'

export interface RenewResult { charged: number; overdraft: boolean }

interface GameState {
  root: FolderNode
  status: GameStatus
  difficulty: Difficulty
  startedAt: number
  wonAt: number | null
  balance: number
  subscriptions: Subscription[]
  /** Calendar day of the current billing month (1-based). */
  day: number
  overdraftUsed: boolean
  locked: boolean
  catsDeleted: Set<number>
  stats: { adsClosed: number; errorsSeen: number; accidentalSubs: number; promptsSurvived: number }
  boot: () => void
  start: (difficulty: Difficulty) => void
  mkdir: (path: string[], name: string) => boolean
  mkdirPath: (path: string[], input: string) => string[] | null
  writeFile: (path: string[], name: string, content: string) => boolean
  deleteNode: (path: string[], name: string) => boolean
  buySub: (name: string, price: number) => void
  renewAll: () => RenewResult
  /** Advance the calendar one day; charges renewals when the month wraps. Returns the renewal result on wrap. */
  advanceDay: () => RenewResult | null
  lock: () => void
  unlock: () => void
  deleteCat: (id: number) => boolean
  ultraWin: () => void
  adClosed: () => void
  errorSeen: () => void
  promptSurvived: () => void
}

function mutateFolder(root: FolderNode, path: string[], fn: (f: FolderNode) => void): FolderNode | null {
  const next = structuredClone(root)
  const node = getNode(next, path)
  if (!node || node.type !== 'folder') return null
  fn(node)
  return next
}

function applyCharge(balance: number, amount: number, overdraftAvailable: boolean): { balance: number; frozen: boolean; overdraft: boolean } {
  const next = balance - amount
  if (next <= 0 && overdraftAvailable) return { balance: 9.99, frozen: false, overdraft: true }
  return { balance: next, frozen: next <= 0, overdraft: false }
}

export const useGame = create<GameState>()((set, get) => ({
  root: initialRoot(),
  status: 'boot',
  difficulty: 'pro',
  startedAt: Date.now(),
  wonAt: null,
  balance: 250,
  subscriptions: [],
  day: 1,
  overdraftUsed: false,
  locked: false,
  catsDeleted: new Set<number>(),
  stats: { adsClosed: 0, errorsSeen: 0, accidentalSubs: 0, promptsSurvived: 0 },

  boot: () => set({ status: 'select' }),

  start: difficulty => set({
    status: 'playing',
    difficulty,
    startedAt: Date.now(),
    balance: DIFFICULTIES[difficulty].startBalance,
    day: 1,
  }),

  mkdir: (path, name) => {
    const trimmed = name.trim()
    if (!trimmed) return false
    const next = mutateFolder(get().root, path, f => {
      if (!f.children[trimmed]) f.children[trimmed] = folder({})
    })
    if (!next) return false
    set({ root: next })
    return true
  },

  /**
   * Path-aware folder creation: "My Documents\win_files" creates/reuses each
   * segment (case-insensitively) relative to `path`. Returns the canonical
   * path of the deepest folder, or null if blocked by a file.
   */
  mkdirPath: (path, input) => {
    const segs = input.split(/[\\/]/).map(s => s.trim()).filter(Boolean)
    if (segs.length === 0) return null
    let current = [...path]
    for (const seg of segs) {
      const node = getNode(get().root, current)
      if (!node || node.type !== 'folder') return null
      const existing = resolveChild(node, seg)
      if (existing) {
        if (node.children[existing].type !== 'folder') return null
        current = [...current, existing]
      } else {
        if (!get().mkdir(current, seg)) return null
        current = [...current, seg]
      }
    }
    return current
  },

  writeFile: (path, name, content) => {
    const trimmed = name.trim()
    if (!trimmed) return false
    const next = mutateFolder(get().root, path, f => {
      f.children[trimmed] = file(content)
    })
    if (!next) return false
    if (isWin(next) && get().status === 'playing') {
      set({ root: next, status: 'won', wonAt: Date.now() })
    } else {
      set({ root: next })
    }
    return true
  },

  deleteNode: (path, name) => {
    const next = mutateFolder(get().root, path, f => {
      delete f.children[name]
    })
    if (!next) return false
    set({ root: next })
    return true
  },

  buySub: (name, price) => {
    const { balance, subscriptions, stats, status } = get()
    if (status !== 'playing') return
    const newBalance = balance - price
    set({
      balance: newBalance,
      subscriptions: [...subscriptions, { name, price }],
      stats: { ...stats, accidentalSubs: stats.accidentalSubs + 1 },
      ...(newBalance <= 0 ? { status: 'frozen' as GameStatus } : {}),
    })
  },

  renewAll: () => {
    const { balance, subscriptions, status, difficulty, overdraftUsed } = get()
    if (status !== 'playing' || subscriptions.length === 0) return { charged: 0, overdraft: false }
    const total = subscriptions.reduce((s, sub) => s + sub.price, 0)
    const grace = DIFFICULTIES[difficulty].overdraftGrace && !overdraftUsed
    const result = applyCharge(balance, total, grace)
    set({
      balance: result.balance,
      ...(result.overdraft ? { overdraftUsed: true } : {}),
      ...(result.frozen ? { status: 'frozen' as GameStatus } : {}),
    })
    return { charged: total, overdraft: result.overdraft }
  },

  advanceDay: () => {
    const { status, day, difficulty } = get()
    if (status !== 'playing') return null
    const { monthDays } = DIFFICULTIES[difficulty]
    if (day >= monthDays) {
      set({ day: 1 })
      return get().renewAll()
    }
    set({ day: day + 1 })
    return null
  },

  lock: () => { if (get().status === 'playing') set({ locked: true }) },
  unlock: () => set({ locked: false }),

  deleteCat: id => {
    const { catsDeleted } = get()
    if (id < 1 || id > CAT_TOTAL || catsDeleted.has(id)) return false
    const next = new Set(catsDeleted)
    next.add(id)
    set({ catsDeleted: next })
    return true
  },

  ultraWin: () => {
    if (get().status === 'playing') set({ status: 'ultrawon', wonAt: Date.now() })
  },

  adClosed: () => set(s => ({ stats: { ...s.stats, adsClosed: s.stats.adsClosed + 1 } })),
  errorSeen: () => set(s => ({ stats: { ...s.stats, errorsSeen: s.stats.errorsSeen + 1 } })),
  promptSurvived: () => set(s => ({ stats: { ...s.stats, promptsSurvived: s.stats.promptsSurvived + 1 } })),
}))

/** The active difficulty's config. */
export function config(): DifficultyConfig {
  return DIFFICULTIES[useGame.getState().difficulty]
}

/** Enterprise disk quota: saves fail until enough cats are deleted. */
export function diskFull(): boolean {
  const c = config()
  return c.catBlocker && useGame.getState().catsDeleted.size < c.catsRequired
}
