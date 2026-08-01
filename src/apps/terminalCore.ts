import { useGame, getNode, resolveChild, isCatPath, catName, diskFull, config, type FolderNode } from '../state/game'
import { chance } from '../chaos/engine'
import { CAT_TOTAL } from '../chaos/difficulty'

/**
 * The command interpreter, extracted from the Terminal component so it can be
 * unit-tested. It reads/writes the game store directly (zustand works
 * headless); everything React-shaped stays in Terminal.tsx.
 */

export interface TermState {
  cwd: string[]
  /** True after `format c:` — the next input is the Y/N answer. */
  awaitingFormat: boolean
}

export interface TermResult {
  lines: string[]
  state: TermState
  /** Side effects the component must perform. */
  effect?: 'close' | 'clear' | 'format'
}

const HELP = [
  'OSXii Command Prompt — commands that mostly work:',
  '  help              this message',
  '  dir               list the current folder',
  '  cd <folder>       change folder (cd .. to go up, cd \\ for root)',
  '  mkdir <name>      create a folder',
  '  echo <text> > <file>   write text into a file',
  '  type <file>       show file contents',
  '  del <file>        delete a file',
  '  cls               clear screen',
  '  exit              close this window',
]

export function stripQuotes(s: string): string {
  const t = s.trim()
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    return t.slice(1, -1)
  }
  return t
}

function currentFolder(cwd: string[]): FolderNode {
  const node = getNode(useGame.getState().root, cwd)
  return node && node.type === 'folder' ? node : useGame.getState().root
}

function resolveCd(cwd: string[], arg: string): string[] | null {
  let next = [...cwd]
  if (arg === '\\' || arg === '/') return []
  const segs = arg.split(/[\\/]/).filter(Boolean)
  for (const seg of segs) {
    if (seg === '..') {
      next.pop()
      continue
    }
    const node = getNode(useGame.getState().root, next)
    if (!node || node.type !== 'folder') return null
    const key = resolveChild(node, seg)
    if (!key) return null
    const child = node.children[key]
    if (child.type !== 'folder') return null
    next = [...next, key]
  }
  return next
}

/** Delete the first surviving cat matching an exact name or a wildcard. */
function delCat(arg: string): string[] {
  const g = useGame.getState()
  if (/[*?]/.test(arg)) {
    for (let id = 1; id <= CAT_TOTAL; id++) {
      if (!g.catsDeleted.has(id)) {
        g.deleteCat(id)
        const fresh = useGame.getState().catsDeleted.size
        return [
          'Wildcard expansion is an OSXii Pro feature. Deleted 1 file.',
          `Deleted ${catName(id)}. ${(CAT_TOTAL - fresh).toLocaleString()} identical cats remain.`,
          fresh >= config().catsRequired ? 'Disk pressure: nominal.' : 'Disk pressure: still critical.',
        ]
      }
    }
    return ['No cats remain. What have you done.']
  }
  const m = arg.match(/^cat_(\d{1,4})\.jpg$/i)
  if (!m) return ['The system cannot find the file specified. (Try: cat_0001.jpg)']
  const id = parseInt(m[1], 10)
  if (!g.deleteCat(id)) return [`${catName(id)} is already gone, or never was.`]
  const deleted = useGame.getState().catsDeleted.size
  return [
    `Deleted ${catName(id)}. The cat remains unbothered in ${(CAT_TOTAL - deleted).toLocaleString()} other files.`,
    deleted >= config().catsRequired ? 'Disk pressure: nominal.' : 'Disk pressure: still critical.',
  ]
}

export function execCommand(raw: string, state: TermState): TermResult {
  const { cwd } = state
  const same = (lines: string[], effect?: TermResult['effect']): TermResult =>
    ({ lines, state: { ...state, awaitingFormat: false }, effect })
  const trimmed = raw.trim()
  if (!trimmed) return same([])

  if (state.awaitingFormat) {
    if (trimmed.toLowerCase() === 'y') {
      return same([
        'Formatting drive C: ...',
        'Deleting ads ................ done.',
        'Deleting subscriptions ...... done.',
        'Deleting OSXii .............. thank you.',
        '',
      ], 'format')
    }
    return same(['Format cancelled. The system exhales, disappointed.'])
  }

  const [cmdWord, ...restParts] = trimmed.split(/\s+/)
  const cmd = cmdWord.toLowerCase()
  const rest = trimmed.slice(cmdWord.length).trim()
  const g = useGame.getState()

  switch (cmd) {
    case 'help':
      return same([...HELP])
    case 'dir':
    case 'ls': {
      if (isCatPath(cwd)) {
        const out = [` Directory of C:\\${cwd.join('\\')}`, '']
        let shown = 0
        for (let id = 1; id <= CAT_TOTAL && shown < 12; id++) {
          if (!g.catsDeleted.has(id)) {
            out.push(`          24,117 ${catName(id)}`)
            shown++
          }
        }
        const remaining = CAT_TOTAL - g.catsDeleted.size
        out.push(`   ... and ${(remaining - shown).toLocaleString()} more. They are all the same cat.`)
        out.push('', `        ${remaining.toLocaleString()} object(s), morale low`)
        return same(out)
      }
      const f = currentFolder(cwd)
      const out = [` Directory of C:\\${cwd.join('\\')}`, '']
      const entries = Object.entries(f.children)
      if (entries.length === 0) out.push('  (echoing emptiness)')
      for (const [name, n] of entries) {
        out.push(n.type === 'folder' ? `  <DIR>          ${name}` : `         ${String(n.content.length).padStart(6)} ${name}`)
      }
      out.push('', `        ${entries.length} object(s), morale low`)
      return same(out)
    }
    case 'cd': {
      if (!rest) return same([`C:\\${cwd.join('\\')}`])
      const next = resolveCd(cwd, stripQuotes(rest))
      if (next === null) return same(['The system cannot find the path specified.'])
      return { lines: [], state: { cwd: next, awaitingFormat: false } }
    }
    case 'mkdir':
    case 'md': {
      if (!rest) return same(['Usage: mkdir <name>'])
      const name = stripQuotes(rest)
      const f = currentFolder(cwd)
      if (!/[\\/]/.test(name) && resolveChild(f, name)) return same([`A subdirectory or file ${name} already exists.`])
      if (!g.mkdirPath(cwd, name)) return same(['Cannot create that path. It resisted.'])
      const out: string[] = []
      if (chance(0.2)) out.push(`Did you mean: mk${name.slice(0, 3)}rr? (It worked anyway.)`)
      return same(out)
    }
    case 'echo': {
      if (!rest) return same(['ECHO is on. Emotionally.'])
      const gtIdx = rest.indexOf('>')
      if (gtIdx === -1) return same([stripQuotes(rest)])
      const text = stripQuotes(rest.slice(0, gtIdx))
      const fname = rest.slice(gtIdx + 1).trim()
      if (!fname) return same(['The syntax of the command is incorrect. Emotionally and literally.'])
      if (diskFull()) {
        return same([
          `Cannot write ${fname}: Drive C: is 110% full.`,
          'Largest offender: C:\\My Pictures\\cat_dump (4,096 items, all the same cat).',
          `Delete at least ${config().catsRequired} of them and try again.`,
        ])
      }
      g.writeFile(cwd, fname, text)
      return same([])
    }
    case 'type':
    case 'cat': {
      if (!rest) return same(['Usage: type <file>'])
      if (isCatPath(cwd)) return same(['[image data] It is a cat making a face you would describe as "unadvisable."'])
      const f = currentFolder(cwd)
      const key = resolveChild(f, stripQuotes(rest))
      const node = key ? f.children[key] : null
      if (!node || node.type !== 'file') return same(['The system cannot find the file specified.'])
      return same(node.content.split('\n'))
    }
    case 'del':
    case 'rm': {
      if (!rest) return same(['Usage: del <file>'])
      if (isCatPath(cwd)) return same(delCat(stripQuotes(rest)))
      const f = currentFolder(cwd)
      const key = resolveChild(f, stripQuotes(rest))
      if (!key) return same(['The system cannot find the file specified.'])
      g.deleteNode(cwd, key)
      return same([`Deleted ${key}. It had a family.`])
    }
    case 'format': {
      const target = restParts.join(' ').toLowerCase()
      if (target !== 'c:' && target !== 'c:\\' && target !== 'c') {
        return same(['Usage: format c:   (but you would never)'])
      }
      return {
        lines: [
          'WARNING: ALL DATA ON DRIVE C: WILL BE DESTROYED.',
          'This includes OSXii itself, every ad, every subscription,',
          'and 4,096 pictures of one (1) cat.',
          '',
          'Proceed with format? (Y/N)',
        ],
        state: { ...state, awaitingFormat: true },
      }
    }
    case 'cls':
    case 'clear':
      return same([], 'clear')
    case 'whoami':
      return same(['osxii\\valued_customer (unverified)'])
    case 'exit':
      return same([], 'close')
    default:
      return same([`'${cmdWord}' is not recognized as an internal or external command,`, 'operable program, or lifestyle choice.'])
  }
}
