import { describe, it, expect, beforeEach } from 'vitest'
import { execCommand, stripQuotes, type TermState } from './terminalCore'
import { useGame, getNode, initialRoot } from '../state/game'
import { DIFFICULTIES, CAT_TOTAL } from '../chaos/difficulty'

const root = (): TermState => ({ cwd: [], awaitingFormat: false })

/** Run a sequence of commands, threading state; returns final state + all lines. */
function run(...cmds: string[]): { state: TermState; lines: string[] } {
  let state = root()
  const lines: string[] = []
  for (const cmd of cmds) {
    const r = execCommand(cmd, state)
    state = r.state
    lines.push(...r.lines)
  }
  return { state, lines }
}

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

describe('navigation', () => {
  it('cd resolves case-insensitively and .. goes up', () => {
    const { state } = run('cd my documents')
    expect(state.cwd).toEqual(['My Documents'])
    expect(execCommand('cd ..', state).state.cwd).toEqual([])
  })

  it('cd \\ returns to root from anywhere', () => {
    const { state } = run('cd My Documents', 'cd \\')
    expect(state.cwd).toEqual([])
  })

  it('cd into a file or nonsense fails without moving', () => {
    const r1 = execCommand('cd nope_not_real', root())
    expect(r1.lines[0]).toMatch(/cannot find the path/)
    expect(r1.state.cwd).toEqual([])
  })

  it('dir lists folders and files', () => {
    const { lines } = run('dir')
    expect(lines.join('\n')).toContain('<DIR>          My Documents')
  })
})

describe('file operations', () => {
  it('the full speedrun path wins the game', () => {
    run('cd My Documents', 'mkdir win_files', 'cd win_files', 'echo I did it! > win.txt')
    expect(useGame.getState().status).toBe('won')
  })

  it('type prints file contents', () => {
    const { lines } = run('cd My Documents', 'type definitely_not_passwords.txt')
    expect(lines).toContain('hunter2')
  })

  it('del removes a file', () => {
    run('cd My Documents', 'del definitely_not_passwords.txt')
    expect(getNode(useGame.getState().root, ['My Documents', 'definitely_not_passwords.txt'])).toBeNull()
  })

  it('echo without redirect just echoes', () => {
    const { lines } = run('echo hello world')
    expect(lines).toEqual(['hello world'])
  })

  it('mkdir refuses duplicates', () => {
    const { lines } = run('cd My Documents', 'mkdir win_files', 'mkdir win_files')
    expect(lines.join('\n')).toMatch(/already exists/)
  })
})

describe('disk quota (Enterprise)', () => {
  it('echo > file is blocked until enough cats die', () => {
    useGame.setState({ difficulty: 'enterprise' })
    const blocked = run('cd My Documents', 'mkdir win_files', 'cd win_files', 'echo I did it! > win.txt')
    expect(blocked.lines.join('\n')).toMatch(/110% full/)
    expect(useGame.getState().status).toBe('playing')

    const g = useGame.getState()
    for (let i = 1; i <= DIFFICULTIES.enterprise.catsRequired; i++) g.deleteCat(i)
    run('cd My Documents', 'cd win_files', 'echo I did it! > win.txt')
    expect(useGame.getState().status).toBe('won')
  })

  it('del in cat_dump counts toward the quota and reports pressure', () => {
    useGame.setState({ difficulty: 'enterprise' })
    let state = execCommand('cd My Pictures\\cat_dump', root()).state
    const first = execCommand('del cat_0001.jpg', state)
    expect(first.lines.join('\n')).toMatch(/still critical/)
    for (let i = 0; i < 9; i++) execCommand('del *.jpg', state)
    expect(useGame.getState().catsDeleted.size).toBe(10)
    const last = execCommand('del cat_0099.jpg', state)
    expect(last.lines.join('\n')).toMatch(/nominal/)
  })

  it('deleting the same cat twice fails the second time', () => {
    const state = execCommand('cd My Pictures\\cat_dump', root()).state
    execCommand('del cat_0042.jpg', state)
    const again = execCommand('del cat_0042.jpg', state)
    expect(again.lines.join('\n')).toMatch(/already gone/)
    expect(useGame.getState().catsDeleted.size).toBe(1)
  })

  it('cat ids outside the dump range are rejected', () => {
    const state = execCommand('cd My Pictures\\cat_dump', root()).state
    const r = execCommand(`del cat_${String(CAT_TOTAL + 1).padStart(4, '0')}.jpg`, state)
    expect(r.lines.join('\n')).toMatch(/already gone, or never was/)
  })
})

describe('format c: state machine', () => {
  it('warns and awaits confirmation', () => {
    const r = execCommand('format c:', root())
    expect(r.state.awaitingFormat).toBe(true)
    expect(r.lines.join('\n')).toMatch(/Proceed with format\? \(Y\/N\)/)
    expect(r.effect).toBeUndefined()
  })

  it('y triggers the format effect', () => {
    const warn = execCommand('format c:', root())
    const go = execCommand('y', warn.state)
    expect(go.effect).toBe('format')
    expect(go.state.awaitingFormat).toBe(false)
  })

  it('anything but y cancels', () => {
    const warn = execCommand('format c:', root())
    const no = execCommand('n', warn.state)
    expect(no.effect).toBeUndefined()
    expect(no.lines.join('\n')).toMatch(/cancelled/)
    expect(no.state.awaitingFormat).toBe(false)
  })

  it('refuses to format anything but C:', () => {
    const r = execCommand('format d:', root())
    expect(r.state.awaitingFormat).toBe(false)
    expect(r.lines.join('\n')).toMatch(/but you would never/)
  })
})

describe('misc', () => {
  it('unknown commands get the lifestyle-choice error', () => {
    expect(run('sudo make me a sandwich').lines.join('\n')).toMatch(/lifestyle choice/)
  })

  it('cls clears and exit closes via effects', () => {
    expect(execCommand('cls', root()).effect).toBe('clear')
    expect(execCommand('exit', root()).effect).toBe('close')
  })

  it('stripQuotes handles both quote styles and bare text', () => {
    expect(stripQuotes('"My Documents"')).toBe('My Documents')
    expect(stripQuotes("'win.txt'")).toBe('win.txt')
    expect(stripQuotes('  plain  ')).toBe('plain')
  })
})
