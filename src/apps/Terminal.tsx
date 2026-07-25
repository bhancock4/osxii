import { useEffect, useRef, useState } from 'react'
import { useGame, getNode, resolveChild, type FolderNode } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { chance } from '../chaos/engine'
import { TERMINAL_QUIPS } from '../content/errors'

const HELP = [
  'Wondows12 Command Prompt — commands that mostly work:',
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
    'Wondows12 [Version 12.0.404]',
    '(c) Wondows Corp. All rights probably reserved.',
    '',
    'Type "help" for a list of commands.',
    '',
  ])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const cmdCount = useRef(0)
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

  const exec = (raw: string): string[] => {
    const trimmed = raw.trim()
    if (!trimmed) return []
    const [cmdWord, ...restParts] = trimmed.split(/\s+/)
    const cmd = cmdWord.toLowerCase()
    const rest = trimmed.slice(cmdWord.length).trim()
    const g = useGame.getState()

    switch (cmd) {
      case 'help':
        return [...HELP]
      case 'dir':
      case 'ls': {
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
        if (resolveChild(f, name)) return [`A subdirectory or file ${name} already exists.`]
        g.mkdir(cwd, name)
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
        g.writeFile(cwd, fname, text)
        return []
      }
      case 'type':
      case 'cat': {
        if (!rest) return ['Usage: type <file>']
        const f = currentFolder()
        const key = resolveChild(f, stripQuotes(rest))
        const node = key ? f.children[key] : null
        if (!node || node.type !== 'file') return ['The system cannot find the file specified.']
        return node.content.split('\n')
      }
      case 'del':
      case 'rm': {
        if (!rest) return ['Usage: del <file>']
        const f = currentFolder()
        const key = resolveChild(f, stripQuotes(rest))
        if (!key) return ['The system cannot find the file specified.']
        g.deleteNode(cwd, key)
        return [`Deleted ${key}. It had a family.`]
      }
      case 'cls':
      case 'clear':
        setLines([])
        return []
      case 'whoami':
        return ['wondows12\\valued_customer (unverified)']
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
    let out = exec(raw)
    cmdCount.current++
    if (out.length > 0 && chance(0.12)) out = [...out, out[out.length - 1]]
    if (chance(0.08)) out = [...out, TERMINAL_QUIPS[Math.floor(Math.random() * TERMINAL_QUIPS.length)]]
    if (cmdCount.current % 6 === 0) {
      usePopups.getState().spawnAd()
      out = [...out, 'ADVERTISEMENT LOADED SUCCESSFULLY (the only thing that loads successfully)']
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
        <div key={i} className="term-line">{l || ' '}</div>
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
