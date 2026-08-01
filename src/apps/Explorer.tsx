import { useRef, useState } from 'react'
import { useGame, getNode, isCatPath, catName } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { chance, chaoticDelay } from '../chaos/engine'
import { CAT_TOTAL } from '../chaos/difficulty'

/** One cat, making a funny face, 4,096 times. */
export const CAT_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="10,26 6,6 26,14" fill="#e8a33d"/>
      <polygon points="54,26 58,6 38,14" fill="#e8a33d"/>
      <polygon points="11,23 9,11 21,16" fill="#f4c07a"/>
      <polygon points="53,23 55,11 43,16" fill="#f4c07a"/>
      <ellipse cx="32" cy="38" rx="24" ry="21" fill="#e8a33d"/>
      <ellipse cx="32" cy="44" rx="14" ry="11" fill="#f7dcb0"/>
      <circle cx="22" cy="32" r="6.5" fill="#fff"/>
      <circle cx="43" cy="30" r="4.5" fill="#fff"/>
      <circle cx="24" cy="33" r="3" fill="#000"/>
      <circle cx="42" cy="31" r="1.6" fill="#000"/>
      <ellipse cx="32" cy="41" rx="3" ry="2" fill="#d97b8f"/>
      <path d="M32 43 Q30 48 25 47" stroke="#000" fill="none" stroke-width="1.4"/>
      <ellipse cx="34" cy="50" rx="4" ry="5" fill="#e26d8c"/>
      <line x1="8" y1="38" x2="20" y2="40" stroke="#000" stroke-width="1"/>
      <line x1="8" y1="44" x2="20" y2="43" stroke="#000" stroke-width="1"/>
      <line x1="56" y1="38" x2="44" y2="40" stroke="#000" stroke-width="1"/>
      <line x1="56" y1="44" x2="44" y2="43" stroke="#000" stroke-width="1"/>
    </svg>`
  )

/** How many cat tiles render before "loading" more on scroll. */
const CAT_PAGE = 240
/** Free-tier batch delete limit. Deleting cats should take a while. */
const CAT_BATCH_LIMIT = 3

function CatDump() {
  const catsDeleted = useGame(s => s.catsDeleted)
  const deleteCat = useGame(s => s.deleteCat)
  const toast = usePopups(s => s.toast)
  const [rendered, setRendered] = useState(CAT_PAGE)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)

  const remaining = CAT_TOTAL - catsDeleted.size
  const visible: number[] = []
  for (let id = 1; id <= CAT_TOTAL && visible.length < rendered; id++) {
    if (!catsDeleted.has(id)) visible.push(id)
  }

  const onScroll = () => {
    const el = gridRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 400 && rendered < CAT_TOTAL) {
      setRendered(r => Math.min(CAT_TOTAL, r + CAT_PAGE))
    }
  }

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deleteSelected = () => {
    if (selected.size === 0) return
    const batch = [...selected].slice(0, CAT_BATCH_LIMIT)
    if (selected.size > CAT_BATCH_LIMIT) {
      toast(`Batch delete is limited to ${CAT_BATCH_LIMIT} files on your plan. Deleted ${CAT_BATCH_LIMIT}.`)
    }
    batch.forEach(id => deleteCat(id))
    setSelected(new Set())
    const total = useGame.getState().catsDeleted.size
    toast(`Deleted ${batch.length} cat(s). The cat is unbothered — it lives in ${CAT_TOTAL - total} other files.`)
  }

  return (
    <>
      <div className="explorer-toolbar">
        <button disabled={selected.size === 0} onClick={deleteSelected}>
          Delete ({selected.size})
        </button>
        <button onClick={() => toast('They are all the same picture.')}>Sort by: Cat</button>
        <button onClick={() => toast('Select All is an OSXii Pro feature. Click harder instead.')}>Select All</button>
      </div>
      <div className="cat-grid" ref={gridRef} onScroll={onScroll}>
        {visible.map(id => (
          <div
            key={id}
            className={'cat-tile' + (selected.has(id) ? ' selected' : '')}
            onClick={() => toggle(id)}
          >
            <img src={CAT_URI} alt="the cat" draggable={false} />
            <span>{catName(id)}</span>
          </div>
        ))}
        {rendered < remaining && <div className="cat-loading">Loading more of the same cat…</div>}
      </div>
      <div className="explorer-status">
        ~{remaining.toLocaleString()} object(s), 99.7% cat — {catsDeleted.size} deleted, disk pressure:{' '}
        {catsDeleted.size >= 10 ? 'improving' : 'critical'}
      </div>
    </>
  )
}

export default function Explorer({ winId }: { winId: number }) {
  const root = useGame(s => s.root)
  const [path, setPath] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const toast = usePopups(s => s.toast)
  const spawnError = usePopups(s => s.spawnError)

  let node = getNode(root, path)
  if (!node || node.type !== 'folder') {
    // current folder vanished (it happens, in OSXii)
    node = root
    if (path.length) setPath([])
  }
  const entries = Object.entries(node.children).sort(([a, na], [b, nb]) => {
    if (na.type !== nb.type) return na.type === 'folder' ? -1 : 1
    return a.localeCompare(b)
  })

  const inCatDump = isCatPath(path)

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
      {!inCatDump && (
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
      )}
      {inCatDump && (
        <div className="explorer-toolbar">
          <button onClick={() => { setPath(p => p.slice(0, -1)); setSelected(null) }}>⬆ Up</button>
        </div>
      )}
      <div className="explorer-address">
        <span>Address:</span>
        <span className="explorer-path">C:\{path.join('\\')}</span>
      </div>
      {inCatDump ? (
        <CatDump />
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
