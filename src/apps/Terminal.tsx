import { useEffect, useRef, useState } from 'react'
import { useGame, getNode, resolveChild, isCatPath, catName, diskFull, config, type FolderNode } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { chance } from '../chaos/engine'
import { CAT_TOTAL } from '../chaos/difficulty'
import { TERMINAL_QUIPS } from '../content/errors'

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

function stripQuotes(s: string): string {
  const t = s.trim()
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    return t.slice(1, -1)
  }
  return t
}

export default function Terminal({ winId }: { winId: number }) {
  const [lines, setLines] = useState<string[]>([
    'OSXii [Version XII.0.404]',
    '(c) OSXii Systems Incorporated. All rights probably reserved.',
    '',
    'Type "help" for a list of commands.',
    '',
  ])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const cmdCount = useRef(0)
  const awaitingFormat = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [lines])

  const prompt = `C:\\${cwd.join('\\')}>`

  const currentFolder = (): FolderNode => {
    const node = getNode(useGame.getState().root, cwd)
    return node && node.type === 'folder' ? node : useGame.getState().root
  }

  const resolveCd = (arg: string): string[] | null => {
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

  /** First surviving cat matching a name like cat_0042.jpg, or a wildcard. */
  const delCat = (arg: string): string[] => {
    const g = useGame.getState()
    const wildcard = /[*?]/.test(arg)
    if (wildcard) {
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

  const exec = (raw: string): string[] => {
    const trimmed = raw.trim()
    if (!trimmed) return []

    if (awaitingFormat.current) {
      awaitingFormat.current = false
      if (trimmed.toLowerCase() === 'y') {
        setTimeout(() => useGame.getState().ultraWin(), 2600)
        return [
          'Formatting drive C: ...',
          'Deleting ads ................ done.',
          'Deleting subscriptions ...... done.',
          'Deleting OSXii .............. thank you.',
          '',
        ]
      }
      return ['Format cancelled. The system exhales, disappointed.']
    }

    const [cmdWord, ...restParts] = trimmed.split(/\s+/)
    const cmd = cmdWord.toLowerCase()
    const rest = trimmed.slice(cmdWord.length).trim()
    const g = useGame.getState()

    switch (cmd) {
      case 'help':
        return [...HELP]
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
          return out
        }
        const f = currentFolder()
        const out = [` Directory of C:\\${cwd.join('\\')}`, '']
        const entries = Object.entries(f.children)
        if (entries.length === 0) out.push('  (echoing emptiness)')
        for (const [name, n] of entries) {
          out.push(n.type === 'folder' ? `  <DIR>          ${name}` : `         ${String(n.content.length).padStart(6)} ${name}`)
        }
        out.push('', `        ${entries.length} object(s), morale low`)
        return out
      }
      case 'cd': {
        if (!rest) return [`C:\\${cwd.join('\\')}`]
        const next = resolveCd(stripQuotes(rest))
        if (next === null) return ['The system cannot find the path specified.']
        setCwd(next)
        return []
      }
      case 'mkdir':
      case 'md': {
        if (!rest) return ['Usage: mkdir <name>']
        const name = stripQuotes(rest)
        const f = currentFolder()
        if (!/[\\/]/.test(name) && resolveChild(f, name)) return [`A subdirectory or file ${name} already exists.`]
        if (!g.mkdirPath(cwd, name)) return ['Cannot create that path. It resisted.']
        const out: string[] = []
        if (chance(0.2)) out.push(`Did you mean: mk${name.slice(0, 3)}rr? (It worked anyway.)`)
        return out
      }
      case 'echo': {
        if (!rest) return ['ECHO is on. Emotionally.']
        const gtIdx = rest.indexOf('>')
        if (gtIdx === -1) return [stripQuotes(rest)]
        const text = stripQuotes(rest.slice(0, gtIdx))
        const fname = rest.slice(gtIdx + 1).trim()
        if (!fname) return ['The syntax of the command is incorrect. Emotionally and literally.']
        if (diskFull()) {
          return [
            `Cannot write ${fname}: Drive C: is 110% full.`,
            'Largest offender: C:\\My Pictures\\cat_dump (4,096 items, all the same cat).',
            `Delete at least ${config().catsRequired} of them and try again.`,
          ]
        }
        g.writeFile(cwd, fname, text)
        return []
      }
      case 'type':
      case 'cat': {
        if (!rest) return ['Usage: type <file>']
        if (isCatPath(cwd)) return ['[image data] It is a cat making a face you would describe as "unadvisable."']
        const f = currentFolder()
        const key = resolveChild(f, stripQuotes(rest))
        const node = key ? f.children[key] : null
        if (!node || node.type !== 'file') return ['The system cannot find the file specified.']
        return node.content.split('\n')
      }
      case 'del':
      case 'rm': {
        if (!rest) return ['Usage: del <file>']
        if (isCatPath(cwd)) return delCat(stripQuotes(rest))
        const f = currentFolder()
        const key = resolveChild(f, stripQuotes(rest))
        if (!key) return ['The system cannot find the file specified.']
        g.deleteNode(cwd, key)
        return [`Deleted ${key}. It had a family.`]
      }
      case 'format': {
        const target = restParts.join(' ').toLowerCase()
        if (target !== 'c:' && target !== 'c:\\' && target !== 'c') {
          return ['Usage: format c:   (but you would never)']
        }
        awaitingFormat.current = true
        return [
          'WARNING: ALL DATA ON DRIVE C: WILL BE DESTROYED.',
          'This includes OSXii itself, every ad, every subscription,',
          'and 4,096 pictures of one (1) cat.',
          '',
          'Proceed with format? (Y/N)',
        ]
      }
      case 'cls':
      case 'clear':
        setLines([])
        return []
      case 'whoami':
        return ['osxii\\valued_customer (unverified)']
      case 'exit':
        useWins.getState().close(winId)
        return []
      default:
        return [`'${cmdWord}' is not recognized as an internal or external command,`, 'operable program, or lifestyle choice.']
    }
  }

  const onSubmit = () => {
    const raw = input
    setInput('')
    setHistIdx(-1)
    if (raw.trim()) setHistory(h => [...h, raw])
    const wasAwaiting = awaitingFormat.current
    let out = exec(raw)
    const suspenseful = wasAwaiting || awaitingFormat.current
    cmdCount.current++
    if (!suspenseful) {
      if (out.length > 0 && chance(0.12)) out = [...out, out[out.length - 1]]
      if (chance(0.08)) out = [...out, TERMINAL_QUIPS[Math.floor(Math.random() * TERMINAL_QUIPS.length)]]
      if (cmdCount.current % 9 === 0) {
        usePopups.getState().spawnAd()
        out = [...out, 'ADVERTISEMENT LOADED SUCCESSFULLY (the only thing that loads successfully)']
      }
    }
    setLines(l => [...l, prompt + ' ' + raw, ...out, ''])
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit()
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
      setHistIdx(idx)
      setInput(history[idx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx === -1) return
      const idx = histIdx + 1
      if (idx >= history.length) { setHistIdx(-1); setInput('') }
      else { setHistIdx(idx); setInput(history[idx]) }
    }
  }

  return (
    <div className="terminal" ref={scrollRef} onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
      {lines.map((l, i) => (
        <div key={i} className="term-line">{l || ' '}</div>
      ))}
      <div className="term-input-row">
        <span>{prompt}</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  )
}
