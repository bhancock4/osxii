import { useEffect, useRef, useState } from 'react'
import { useGame, getNode, folder } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { chance, maybeSabotageText } from '../chaos/engine'

function SaveDialog({
  initialName,
  onSave,
  onCancel,
}: {
  initialName: string
  onSave: (path: string[], name: string) => void
  onCancel: () => void
}) {
  const root = useGame(s => s.root)
  const [path, setPath] = useState<string[]>([])
  const [name, setName] = useState(initialName)
  const [dodged, setDodged] = useState(false)
  const [dodgeOffset, setDodgeOffset] = useState({ x: 0, y: 0 })

  const node = getNode(root, path)
  const current = node && node.type === 'folder' ? node : folder({})
  const subfolders = Object.entries(current.children)
    .filter(([, n]) => n.type === 'folder')
    .map(([k]) => k)
    .sort()

  const onSaveHover = () => {
    if (!dodged && chance(0.3)) {
      setDodged(true)
      setDodgeOffset({ x: -60 - Math.random() * 40, y: (Math.random() - 0.5) * 30 })
    }
  }

  return (
    <div className="save-dialog window">
      <div className="title-bar">
        <div className="title-bar-text">Save As</div>
      </div>
      <div className="window-body save-body">
        <div className="save-path">
          <button disabled={path.length === 0} onClick={() => setPath(p => p.slice(0, -1))}>⬆ Up</button>
          <span className="save-address">C:\{path.join('\\')}</span>
        </div>
        <ul className="save-list">
          {subfolders.length === 0 && <li className="save-empty">(no folders here)</li>}
          {subfolders.map(f => (
            <li key={f} onDoubleClick={() => setPath(p => [...p, f])}>📁 {f}</li>
          ))}
        </ul>
        <div className="save-row">
          <label>File name:</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="save-actions">
          <button
            style={{ transform: `translate(${dodgeOffset.x}px, ${dodgeOffset.y}px)` }}
            onMouseEnter={onSaveHover}
            onClick={() => name.trim() && onSave(path, name.trim())}
          >
            Save
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Notepad({ winId, props }: { winId: number; props?: Record<string, unknown> }) {
  const writeFile = useGame(s => s.writeFile)
  const setTitle = useWins(s => s.setTitle)
  const toast = usePopups(s => s.toast)
  const [content, setContent] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [glitching, setGlitching] = useState(false)
  const fileName = (props?.fileName as string | undefined) ?? 'untitled.txt'
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const filePath = props?.filePath as string[] | undefined
    const name = props?.fileName as string | undefined
    if (filePath && name) {
      const node = getNode(useGame.getState().root, [...filePath, name])
      if (node && node.type === 'file') {
        setContent(node.content)
        setTitle(winId, `${name} - Notepad`)
      }
    }
  }, [props, winId, setTitle])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let next = e.target.value
    // keystroke gremlin: occasionally the last two characters arrive out of order (visibly!)
    if (next.length > content.length && next.length >= 2 && chance(0.03)) {
      next = next.slice(0, -2) + next.slice(-1) + next.slice(-2, -1)
      setGlitching(true)
      setTimeout(() => setGlitching(false), 200)
    }
    setContent(next)
  }

  const doSave = (path: string[], name: string) => {
    setShowSave(false)
    const { text: finalText, sabotaged } = maybeSabotageText(content)
    toast('Saving… please hold.')
    setTimeout(() => {
      if (sabotaged) {
        setContent(finalText)
        toast('✨ SmartAssist™ improved your document! You’re welcome.')
      }
      writeFile(path, name, finalText)
      setTitle(winId, `${name} - Notepad`)
      toast(`Saved to C:\\${[...path, name].join('\\')}`)
    }, 400 + Math.random() * 1200)
  }

  return (
    <div className="notepad">
      <div className="menubar">
        <button className="menu-btn" onClick={() => setShowMenu(m => !m)}>File</button>
        <button className="menu-btn" onClick={() => toast('Edit is a Wondows12 Pro feature.')}>Edit</button>
        <button className="menu-btn" onClick={() => toast('Help yourself. We believe in you.')}>Help</button>
        {showMenu && (
          <div className="menu-dropdown">
            <button onClick={() => { setContent(''); setTitle(winId, 'Untitled - Notepad'); setShowMenu(false) }}>New</button>
            <button onClick={() => { setShowSave(true); setShowMenu(false) }}>Save As…</button>
            <button onClick={() => { setShowMenu(false); useWins.getState().close(winId) }}>Exit</button>
          </div>
        )}
      </div>
      <textarea
        className={'notepad-text' + (glitching ? ' glitch' : '')}
        value={content}
        onChange={onChange}
        spellCheck={false}
        placeholder="Type here. What could go wrong?"
      />
      {showSave && (
        <SaveDialog initialName={fileName} onSave={doSave} onCancel={() => setShowSave(false)} />
      )}
    </div>
  )
}
