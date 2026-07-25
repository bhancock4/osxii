import { describe, it, expect, beforeEach } from 'vitest'
import { useGame, getNode, resolveChild, resolvePath, initialRoot } from './game'

const g = () => useGame.getState()

beforeEach(() => {
  useGame.setState({
    root: initialRoot(),
    status: 'playing',
    balance: 250,
    subscriptions: [],
    wonAt: null,
    stats: { adsClosed: 0, errorsSeen: 0, accidentalSubs: 0 },
  })
})

describe('win detection', () => {
  const winPath = ['My Documents', 'win_files']

  it('wins on exact content in the right folder', () => {
    g().mkdir(['My Documents'], 'win_files')
    g().writeFile(winPath, 'win.txt', 'I did it!')
    expect(g().status).toBe('won')
  })

  it('forgives a trailing newline', () => {
    g().mkdir(['My Documents'], 'win_files')
    g().writeFile(winPath, 'win.txt', 'I did it!\n')
    expect(g().status).toBe('won')
  })

  it.each([
    ['wrong case', 'i did it!'],
    ['SmartAssist emoji', 'I did it! 🙂'],
    ['missing bang', 'I did it'],
    ['leading space', ' I did it!'],
  ])('does not win on %s', (_label, content) => {
    g().mkdir(['My Documents'], 'win_files')
    g().writeFile(winPath, 'win.txt', content)
    expect(g().status).toBe('playing')
  })

  it('does not win in the wrong folder', () => {
    g().mkdir([], 'win_files')
    g().writeFile(['win_files'], 'win.txt', 'I did it!')
    expect(g().status).toBe('playing')
  })

  it('does not win with the wrong filename', () => {
    g().mkdir(['My Documents'], 'win_files')
    g().writeFile(winPath, 'win.TXT', 'I did it!')
    expect(g().status).toBe('playing')
  })
})

describe('mkdirPath (path-aware folder creation)', () => {
  it('creates a plain folder', () => {
    expect(g().mkdirPath(['My Documents'], 'win_files')).toEqual(['My Documents', 'win_files'])
    expect(getNode(g().root, ['My Documents', 'win_files'])).toBeTruthy()
  })

  it('creates nested folders from a backslash path', () => {
    const res = g().mkdirPath([], 'My Documents\\win_files')
    expect(res).toEqual(['My Documents', 'win_files'])
    expect(getNode(g().root, ['My Documents', 'win_files'])?.type).toBe('folder')
  })

  it('reuses existing segments case-insensitively', () => {
    const res = g().mkdirPath([], 'my documents/win_files')
    expect(res).toEqual(['My Documents', 'win_files'])
    // did not create a duplicate 'my documents'
    const root = g().root
    const names = Object.keys(root.children).filter(n => n.toLowerCase() === 'my documents')
    expect(names).toEqual(['My Documents'])
  })

  it('is idempotent', () => {
    g().mkdirPath([], 'My Documents\\win_files')
    const res = g().mkdirPath([], 'My Documents\\win_files')
    expect(res).toEqual(['My Documents', 'win_files'])
  })

  it('refuses when a file blocks the path', () => {
    expect(g().mkdirPath(['My Documents'], 'definitely_not_passwords.txt\\sub')).toBeNull()
  })

  it('refuses empty input', () => {
    expect(g().mkdirPath([], '  \\ / ')).toBeNull()
  })
})

describe('economy', () => {
  it('charges the first payment on subscribe', () => {
    g().buySub('RAM Insurance', 49.99)
    expect(g().balance).toBeCloseTo(200.01)
    expect(g().status).toBe('playing')
    expect(g().stats.accidentalSubs).toBe(1)
  })

  it('renewAll charges every subscription at once', () => {
    g().buySub('A', 20)
    g().buySub('B', 30)
    const charged = g().renewAll()
    expect(charged).toBeCloseTo(50)
    expect(g().balance).toBeCloseTo(250 - 50 - 50)
  })

  it('freezes the account at or below $0', () => {
    useGame.setState({ balance: 25 })
    g().buySub('Overpriced Thing', 25)
    expect(g().status).toBe('frozen')
  })

  it('renewAll is a no-op once frozen or won', () => {
    g().buySub('A', 20)
    useGame.setState({ status: 'frozen' })
    expect(g().renewAll()).toBe(0)
    useGame.setState({ status: 'won' })
    expect(g().renewAll()).toBe(0)
  })

  it('subscribing does nothing after the game ends', () => {
    useGame.setState({ status: 'won' })
    g().buySub('Too Late Deluxe', 10)
    expect(g().balance).toBeCloseTo(250)
    expect(g().subscriptions).toHaveLength(0)
  })
})

describe('case-insensitive path resolution (terminal)', () => {
  it('resolves mixed-case paths to canonical names', () => {
    g().mkdir(['My Documents'], 'win_files')
    expect(resolvePath(g().root, ['my documents', 'WIN_FILES'])).toEqual(['My Documents', 'win_files'])
  })

  it('resolveChild finds children regardless of case', () => {
    const md = getNode(g().root, ['My Documents'])
    expect(md?.type).toBe('folder')
    if (md?.type === 'folder') {
      expect(resolveChild(md, 'DEFINITELY_not_passwords.TXT')).toBe('definitely_not_passwords.txt')
    }
  })

  it('returns null for nonexistent paths', () => {
    expect(resolvePath(g().root, ['My Documents', 'nope'])).toBeNull()
  })
})
