import { useState } from 'react'
import { useGame, getNode } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { chance, chaoticDelay } from '../chaos/engine'

export default function Explorer({ winId }: { winId: number }) {
  const root = useGame(s => s.root)
  const [path, setPath] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const toast = usePopups(s => s.toast)
  const spawnError = usePopups(s => s.spawnError)

  let node = getNode(root, path)
  if (!node || node.type !== 'folder') {
    // current folder vanished (it happens, in Wondows)
    node = root
    if (path.length) setPath([])
  }
  const entries = Object.entries(node.children).sort(([a, na], [b, nb]) => {
    if (na.type !== nb.type) return na.type === 'folder' ? -1 : 1
    return a.localeCompare(b)
  })

  const createFolder = () => {
    const name = newName.trim()
    if (!name) {
      toast('Please name your folder. It deserves that much.')
      return
    }
    setNewName('')
    const targetPath = [...path]
    toast('Working on it…')
    if (chance(0.25)) {
      setTimeout(() => {
        spawnError({
          title: 'Folder Creation Wizard',
          body: `Could not create "${name}". The folder may still be created. Time is a flat circle.`,
          button: 'OK 🙂',
        })
      }, 400)
    }
    setTimeout(() => {
      const g = useGame.getState()
      g.mkdirPath(targetPath, name)
      if (chance(0.15) && !/[\\/]/.test(name)) {
        g.mkdir(targetPath, `${name} (2)`)
        usePopups.getState().toast(`Created "${name}" twice, to be safe.`)
      }
    }, chaoticDelay())
  }

  const openEntry = (name: string, type: 'folder' | 'file') => {
    if (type === 'folder') {
      setPath(p => [...p, name])
      setSelected(null)
    } else {
      useWins.getState().open('notepad', { filePath: [...path], fileName: name })
    }
  }

  const deleteSelected = () => {
    if (!selected) return
    const targetPath = [...path]
    const name = selected
    setSelected(null)
    if (chance(0.2)) {
      spawnError({
        title: 'Delete',
        body: `"${name}" is in use by: Ads. Deleting it anyway, eventually.`,
        button: 'Accept',
      })
    }
    setTimeout(() => useGame.getState().deleteNode(targetPath, name), chaoticDelay() * 0.5)
  }

  return (
    <div className="explorer">
      <div className="explorer-toolbar">
        <button disabled={path.length === 0} onClick={() => { setPath(p => p.slice(0, -1)); setSelected(null) }}>
          ⬆ Up
        </button>
        <button onClick={() => toast('Refreshed! (nothing changed)')}>Refresh</button>
        <button disabled={!selected} onClick={deleteSelected}>Delete</button>
        <input
          className="explorer-newname"
          placeholder="new folder name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createFolder()}
        />
        <button onClick={createFolder}>Create</button>
      </div>
      <div className="explorer-address">
        <span>Address:</span>
        <span className="explorer-path">C:\{path.join('\\')}</span>
      </div>
      <ul className="explorer-list">
        {entries.length === 0 && <li className="explorer-empty">This folder is empty (or is it?)</li>}
        {entries.map(([name, n]) => (
          <li
            key={name}
            className={selected === name ? 'selected' : ''}
            onClick={() => setSelected(name)}
            onDoubleClick={() => openEntry(name, n.type)}
          >
            {n.type === 'folder' ? '📁' : '📄'} {name}
          </li>
        ))}
      </ul>
      <div className="explorer-status">
        {entries.length} object(s) — double-click to open — window #{winId}
      </div>
    </div>
  )
}
