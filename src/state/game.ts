import { create } from 'zustand'

export interface FolderNode { type: 'folder'; children: Record<string, FSNode> }
export interface FileNode { type: 'file'; content: string }
export type FSNode = FolderNode | FileNode

export const folder = (children: Record<string, FSNode> = {}): FolderNode => ({ type: 'folder', children })
export const file = (content: string): FileNode => ({ type: 'file', content })

function initialRoot(): FolderNode {
  return folder({
    'My Documents': folder({
      'tax_stuff_2019': folder({}),
      'definitely_not_passwords.txt': file('hunter2\nhunter3 (backup)\n'),
    }),
    'Program Files': folder({
      'Wondows Defender (trial expired)': folder({}),
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

/** Case-insensitive child lookup (it's Wondows, after all) */
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

function isWin(root: FolderNode): boolean {
  const n = getNode(root, ['My Documents', 'win_files', 'win.txt'])
  return !!n && n.type === 'file' && n.content.trimEnd() === 'I did it!'
}

export interface Subscription { name: string; price: number }

export type GameStatus = 'boot' | 'playing' | 'won' | 'frozen'

interface GameState {
  root: FolderNode
  status: GameStatus
  startedAt: number
  wonAt: number | null
  balance: number
  subscriptions: Subscription[]
  stats: { adsClosed: number; errorsSeen: number; accidentalSubs: number }
  boot: () => void
  mkdir: (path: string[], name: string) => boolean
  writeFile: (path: string[], name: string, content: string) => boolean
  deleteNode: (path: string[], name: string) => boolean
  buySub: (name: string, price: number) => void
  renewAll: () => number
  adClosed: () => void
  errorSeen: () => void
}

function mutateFolder(root: FolderNode, path: string[], fn: (f: FolderNode) => void): FolderNode | null {
  const next = structuredClone(root)
  const node = getNode(next, path)
  if (!node || node.type !== 'folder') return null
  fn(node)
  return next
}

export const useGame = create<GameState>()((set, get) => ({
  root: initialRoot(),
  status: 'boot',
  startedAt: Date.now(),
  wonAt: null,
  balance: 250,
  subscriptions: [],
  stats: { adsClosed: 0, errorsSeen: 0, accidentalSubs: 0 },

  boot: () => set({ status: 'playing', startedAt: Date.now() }),

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
    const { balance, subscriptions, status } = get()
    if (status !== 'playing' || subscriptions.length === 0) return 0
    const total = subscriptions.reduce((s, sub) => s + sub.price, 0)
    const newBalance = balance - total
    set({
      balance: newBalance,
      ...(newBalance <= 0 ? { status: 'frozen' as GameStatus } : {}),
    })
    return total
  },

  adClosed: () => set(s => ({ stats: { ...s.stats, adsClosed: s.stats.adsClosed + 1 } })),
  errorSeen: () => set(s => ({ stats: { ...s.stats, errorsSeen: s.stats.errorsSeen + 1 } })),
}))
