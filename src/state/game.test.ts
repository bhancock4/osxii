import { describe, it, expect, beforeEach } from 'vitest'
import { useGame, getNode, resolveChild, resolvePath, initialRoot, diskFull, isCatPath, catName } from './game'
import { DIFFICULTIES, CAT_TOTAL } from '../chaos/difficulty'

const g = () => useGame.getState()

beforeEach(() => {
  useGame.setState({
    root: initialRoot(),
    status: 'playing',
    difficulty: 'pro',
    balance: 250,
    subscriptions: [],
    day: 1,
    overdraftUsed: false,
    locked: false,
    catsDeleted: new Set<number>(),
    wonAt: null,
    stats: { adsClosed: 0, errorsSeen: 0, accidentalSubs: 0, promptsSurvived: 0 },
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
    const { charged } = g().renewAll()
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
    expect(g().renewAll().charged).toBe(0)
    useGame.setState({ status: 'won' })
    expect(g().renewAll().charged).toBe(0)
  })

  it('subscribing does nothing after the game ends', () => {
    useGame.setState({ status: 'won' })
    g().buySub('Too Late Deluxe', 10)
    expect(g().balance).toBeCloseTo(250)
    expect(g().subscriptions).toHaveLength(0)
  })
})

describe('calendar (visible economy timer)', () => {
  it('advances one day at a time without charging', () => {
    g().buySub('A', 20)
    const before = g().balance
    expect(g().advanceDay()).toBeNull()
    expect(g().day).toBe(2)
    expect(g().balance).toBe(before)
  })

  it('wraps to Day 1 at month end and charges renewals', () => {
    g().buySub('A', 20)
    useGame.setState({ day: DIFFICULTIES.pro.monthDays })
    const result = g().advanceDay()
    expect(result?.charged).toBeCloseTo(20)
    expect(g().day).toBe(1)
    expect(g().balance).toBeCloseTo(250 - 20 - 20)
  })

  it('does not tick when the game is not in progress', () => {
    useGame.setState({ status: 'won' })
    expect(g().advanceDay()).toBeNull()
    expect(g().day).toBe(1)
  })
})

describe('overdraft grace (Home edition)', () => {
  it('bails the player out exactly once instead of freezing', () => {
    useGame.setState({ difficulty: 'home', balance: 30 })
    g().buySub('Pricey', 25) // balance now 5
    useGame.setState({ day: DIFFICULTIES.home.monthDays })
    const first = g().advanceDay()
    expect(first?.overdraft).toBe(true)
    expect(g().balance).toBeCloseTo(9.99)
    expect(g().status).toBe('playing')
    // second unaffordable renewal actually freezes
    useGame.setState({ day: DIFFICULTIES.home.monthDays })
    const second = g().advanceDay()
    expect(second?.overdraft).toBe(false)
    expect(g().status).toBe('frozen')
  })

  it('never bails out on Professional', () => {
    useGame.setState({ difficulty: 'pro', balance: 10 })
    g().buySub('Pricey', 5) // balance 5, renewal 5... still positive
    useGame.setState({ balance: 4, day: DIFFICULTIES.pro.monthDays })
    g().advanceDay()
    expect(g().status).toBe('frozen')
  })
})

describe('cat_dump disk quota', () => {
  it('deleteCat counts each cat once', () => {
    expect(g().deleteCat(1)).toBe(true)
    expect(g().deleteCat(1)).toBe(false)
    expect(g().deleteCat(0)).toBe(false)
    expect(g().deleteCat(CAT_TOTAL + 1)).toBe(false)
    expect(g().catsDeleted.size).toBe(1)
  })

  it('blocks saves on Enterprise until enough cats are deleted', () => {
    useGame.setState({ difficulty: 'enterprise' })
    expect(diskFull()).toBe(true)
    for (let i = 1; i <= DIFFICULTIES.enterprise.catsRequired; i++) g().deleteCat(i)
    expect(diskFull()).toBe(false)
  })

  it('never blocks saves below Enterprise', () => {
    expect(diskFull()).toBe(false)
    useGame.setState({ difficulty: 'home' })
    expect(diskFull()).toBe(false)
  })

  it('recognizes the cat folder path case-insensitively', () => {
    expect(isCatPath(['My Pictures', 'cat_dump'])).toBe(true)
    expect(isCatPath(['my pictures', 'CAT_DUMP'])).toBe(true)
    expect(isCatPath(['My Documents', 'cat_dump'])).toBe(false)
    expect(catName(7)).toBe('cat_0007.jpg')
  })
})

describe('format c: (total system liberation)', () => {
  it('ultraWin ends the game from playing', () => {
    g().ultraWin()
    expect(g().status).toBe('ultrawon')
    expect(g().wonAt).not.toBeNull()
  })

  it('ultraWin does nothing after the game already ended', () => {
    useGame.setState({ status: 'frozen' })
    g().ultraWin()
    expect(g().status).toBe('frozen')
  })
})

describe('difficulty start', () => {
  it('start() applies the edition starting balance', () => {
    g().start('enterprise')
    expect(g().status).toBe('playing')
    expect(g().balance).toBe(DIFFICULTIES.enterprise.startBalance)
    expect(g().day).toBe(1)
  })
})

describe('lock screen', () => {
  it('locks only while playing and unlocks cleanly', () => {
    g().lock()
    expect(g().locked).toBe(true)
    g().unlock()
    expect(g().locked).toBe(false)
    useGame.setState({ status: 'won' })
    g().lock()
    expect(g().locked).toBe(false)
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
