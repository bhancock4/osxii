import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { chance } from '../chaos/engine'
import { execCommand } from './terminalCore'
import { TERMINAL_QUIPS } from '../content/errors'

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

  const onSubmit = () => {
    const raw = input
    setInput('')
    setHistIdx(-1)
    if (raw.trim()) setHistory(h => [...h, raw])

    const wasAwaiting = awaitingFormat.current
    const result = execCommand(raw, { cwd, awaitingFormat: awaitingFormat.current })
    awaitingFormat.current = result.state.awaitingFormat
    setCwd(result.state.cwd)
    if (result.effect === 'close') {
      useWins.getState().close(winId)
      return
    }
    if (result.effect === 'clear') setLines([])
    if (result.effect === 'format') {
      setTimeout(() => useGame.getState().ultraWin(), 2600)
    }

    let out = result.lines
    const suspenseful = wasAwaiting || awaitingFormat.current || result.effect === 'format'
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
