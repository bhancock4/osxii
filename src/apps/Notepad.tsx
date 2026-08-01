import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame, getNode, folder, config, diskFull } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import { chance, maybeSabotageText } from '../chaos/engine'
import DialUp from '../components/DialUp'

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
  const [newFolder, setNewFolder] = useState('')
  const [dodged, setDodged] = useState(false)
  const [dodgeOffset, setDodgeOffset] = useState({ x: 0, y: 0 })

  const node = getNode(root, path)
  const current = node && node.type === 'folder' ? node : folder({})
  const subfolders = Object.entries(current.children)
    .filter(([, n]) => n.type === 'folder')
    .map(([k]) => k)
    .sort()

  const onSaveHover = () => {
    if (!dodged && chance(config().saveDodgeChance)) {
      setDodged(true)
      setDodgeOffset({ x: -60 - Math.random() * 40, y: (Math.random() - 0.5) * 30 })
    }
  }

  return (
    <div className="save-dialog window">
      <div className="title-bar">
        <div className="title-bar-text">Save As (Legacy)</div>
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
          <input
            placeholder="new folder name"
            value={newFolder}
            onChange={e => setNewFolder(e.target.value)}
          />
          <button
            disabled={!newFolder.trim()}
            onClick={() => {
              const created = useGame.getState().mkdirPath(path, newFolder.trim())
              if (created) {
                setPath(created)
                setNewFolder('')
              }
            }}
          >
            New Folder
          </button>
        </div>
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

interface MenuItem {
  label: string
  action?: () => void
  /** Nested submenu — the ribbon goes deeper. */
  sub?: MenuItem[]
}

export default function Notepad({ winId, props }: { winId: number; props?: Record<string, unknown> }) {
  const writeFile = useGame(s => s.writeFile)
  const setTitle = useWins(s => s.setTitle)
  const toast = usePopups(s => s.toast)
  const spawnError = usePopups(s => s.spawnError)
  const degraded = usePopups(s => s.degraded)
  const [content, setContent] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [dialUpTarget, setDialUpTarget] = useState<{ path: string[]; name: string } | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [openSub, setOpenSub] = useState<string | null>(null)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [hackerTyping, setHackerTyping] = useState(false)
  const [glitching, setGlitching] = useState(false)
  const [fontSize, setFontSize] = useState(13)
  const [comicSans, setComicSans] = useState(false)
  const [boldMode, setBoldMode] = useState(false)
  const [textColor, setTextColor] = useState<string | null>(null)
  const fileName = (props?.fileName as string | undefined) ?? 'untitled.txt'
  const loaded = useRef(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

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

  // Remote Assistance™: the hacker types their taunt character by character
  // while the textarea is locked. You can only watch.
  const autoType = props?.autoType as string | undefined
  useEffect(() => {
    if (!autoType) return
    setHackerTyping(true)
    let i = 0
    const id = setInterval(() => {
      i++
      setContent(autoType.slice(0, i))
      if (i >= autoType.length) {
        clearInterval(id)
        setHackerTyping(false)
      }
    }, 48)
    return () => clearInterval(id)
  }, [autoType])

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

  const insertAtCursor = (text: string) => {
    const ta = taRef.current
    const pos = ta ? ta.selectionStart : content.length
    setContent(c => c.slice(0, pos) + text + c.slice(pos))
  }

  const finishSave = useCallback((path: string[], name: string) => {
    if (diskFull()) {
      spawnError({
        title: 'OSXii Disk Manager',
        body: `Cannot save "${name}": Drive C: is 110% full. Largest offender: C:\\My Pictures\\cat_dump (4,096 items, all the same cat). Delete at least ${config().catsRequired} of them and try again.`,
        button: 'But how',
      })
      return
    }
    const current = taRef.current?.value ?? ''
    const { text: finalText, sabotaged } = maybeSabotageText(current)
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
  }, [spawnError, toast, writeFile, winId, setTitle])

  const doSave = (path: string[], name: string) => {
    setShowSave(false)
    if (chance(config().dialUpChance)) {
      toast('An internet connection is required to save. (DRM. Sorry. Not sorry.)')
      setDialUpTarget({ path, name })
      return
    }
    finishSave(path, name)
  }

  const onDialUpDone = useCallback(() => {
    if (dialUpTarget) {
      const t = dialUpTarget
      setDialUpTarget(null)
      finishSave(t.path, t.name)
    }
  }, [dialUpTarget, finishSave])

  const closeMenus = () => {
    setActiveTab(null)
    setOpenSub(null)
  }

  const say = (text: string) => () => {
    toast(text)
    closeMenus()
  }
  const err = (title: string, body: string, button = 'OK 🙂') => () => {
    spawnError({ title, body, button })
    closeMenus()
  }
  const act = (fn: () => void) => () => {
    fn()
    closeMenus()
  }

  // 8 tabs, 35+ options, nested submenus. The one that saves your file is in
  // Tools → Document Services, because of course it is.
  const RIBBON: Record<string, MenuItem[]> = {
    File: [
      { label: 'New', action: act(() => { setContent(''); setTitle(winId, 'Untitled - Notepad') }) },
      { label: 'Open…', action: err('Open', 'The file picker searched everywhere and found nothing worth opening.') },
      { label: 'Recent Files', sub: [{ label: '(you have no history with us)', action: say('Exactly.') }] },
      { label: 'Save', action: say('Quick Save is an OSXii Pro feature. Save As… still works — if you can find where it went.') },
      { label: 'Save As…', action: err('Save As', 'Save As… has been relocated to Tools → Document Services, for compliance reasons. This dialog is all that remains.') },
      { label: 'Page Setup', action: say('The page has been set up. It was already up.') },
      { label: 'Print', action: act(() => { toast('No printer found. Have you considered a subscription?'); usePopups.getState().spawnAd('printer-ink') }) },
      { label: 'Exit', action: () => useWins.getState().close(winId) },
    ],
    Edit: [
      { label: 'Undo', action: say('Nothing to undo. History is a Pro feature.') },
      { label: 'Redo', action: say('Redid nothing, flawlessly.') },
      { label: 'Cut', action: say('Cutting is a Pro feature. Copying is fine. We copy everything.') },
      { label: 'Copy', action: say('Copied to a clipboard. Somewhere. Someone’s.') },
      { label: 'Paste', action: say('The clipboard declined to participate.') },
      { label: 'Find…', action: say('It could not be found.') },
      { label: 'Replace…', action: say('Replaced nothing with nothing. Operation successful.') },
    ],
    View: [
      { label: 'Zoom In', action: act(() => setFontSize(s => Math.min(28, s + 2))) },
      { label: 'Zoom Out', action: act(() => setFontSize(s => Math.max(9, s - 2))) },
      { label: 'Word Wrap', action: say('Your text is already wrapped. Emotionally.') },
      { label: 'Full Screen', action: say('This is as full as the screen gets on your license tier.') },
      { label: 'Status Bar', action: say('Status: bar.') },
    ],
    Insert: [
      { label: 'Date/Time', action: act(() => insertAtCursor('13/32/1997 25:61')) },
      { label: 'Emoji', action: act(() => insertAtCursor(['🙂', '💾', '📎', '🐛', '🫠'][Math.floor(Math.random() * 5)])) },
      { label: 'Horizontal Rule', action: act(() => insertAtCursor('\n――――――――――\n')) },
      { label: 'WordArt', sub: [
        { label: 'Rainbow Arc', action: say('WordArt requires OSXii Pro and a moment of silence for 1997.') },
        { label: 'Chrome Bevel', action: say('Chrome Bevel is still rendering. Check back in 2031.') },
      ] },
      { label: 'Hyperlink…', action: say('Linked. To what? Unclear.') },
    ],
    Format: [
      { label: 'Font…', action: err('Font Manager', 'Fonts are rented, not owned. Your lease on Courier New is current.') },
      { label: 'Comic Sans Mode', action: act(() => setComicSans(v => !v)) },
      { label: 'Bold Everything', action: act(() => setBoldMode(v => !v)) },
      { label: 'Text Color', sub: [
        { label: 'Hot Pink', action: act(() => setTextColor('#ff2fa0')) },
        { label: 'Blurple', action: act(() => setTextColor('#5865f2')) },
        { label: 'Regret Green', action: act(() => setTextColor('#1f7a1f')) },
        { label: 'Default (boring)', action: act(() => setTextColor(null)) },
      ] },
      { label: 'Clear Formatting', action: say('Formatting cleared. It had so much potential.') },
    ],
    Tools: [
      { label: 'Spell Check', action: say('47 problems found. All of them are the document.') },
      { label: 'Word Count', action: say(`Word count: approximately ${Math.max(1, content.length * 3)} (method: vibes)`) },
      { label: 'AutoSummarize', action: say('Your document, summarized: text.') },
      { label: 'Document Services', sub: [
        { label: 'Sync to OSXii Cloud™', action: act(() => usePopups.getState().spawnAd('cloudbin')) },
        { label: 'Export as PDF', action: say('PDF export failed successfully.') },
        { label: 'Save As… (Legacy)', action: act(() => setShowSave(true)) },
        { label: 'Notarize Document', action: err('Notary Services', 'No notary is available at this time. One has been dispatched on horseback.') },
      ] },
      { label: 'Options…', action: say('Options are not optional.') },
    ],
    Review: [
      { label: 'Track Changes', action: say('We have been tracking everything, always.') },
      { label: 'Add Comment', action: say('Noted. Ignored.') },
      { label: 'Compatibility Check', action: say('Compatible with nothing. A perfect score.') },
    ],
    Help: [
      { label: 'OSXii Assistant', action: act(() => usePopups.getState().showBindows()) },
      { label: 'Check for Updates', action: act(() => usePopups.getState().showUpdate()) },
      { label: 'About Notepad', action: say('Notepad v12. It has seen things.') },
    ],
  }

  const items = activeTab ? RIBBON[activeTab] : null
  const tabNames = Object.keys(RIBBON)
  // Post-upgrade "streamlining": tabs collapse into an unnecessary hamburger,
  // in an order chosen by the upgrade. Stable per render pass — deterministic
  // shuffle keyed off nothing meaningful, like most UI redesigns.
  const shuffledTabs = degraded
    ? [...tabNames].sort((a, b) => ((a.length * 7 + a.charCodeAt(0)) % 11) - ((b.length * 7 + b.charCodeAt(0)) % 11))
    : tabNames

  return (
    <div className="notepad">
      {degraded ? (
        <div className="ribbon-tabs">
          <button className="menu-btn hamburger-btn" onClick={() => { setHamburgerOpen(o => !o); setOpenSub(null) }}>
            ☰ Menu
          </button>
          {activeTab && <span className="hamburger-crumb">▸ {activeTab}</span>}
          {hamburgerOpen && (
            <div className="menu-dropdown hamburger-menu">
              {shuffledTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setHamburgerOpen(false); setOpenSub(null) }}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="ribbon-tabs">
          {tabNames.map(tab => (
            <button
              key={tab}
              className={'menu-btn' + (activeTab === tab ? ' ribbon-tab-active' : '')}
              onClick={() => { setActiveTab(t => (t === tab ? null : tab)); setOpenSub(null) }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}
      {items && (
        <div className="ribbon-row">
          {items.map(item => (
            <span key={item.label} className="ribbon-item-wrap">
              <button
                className="ribbon-item"
                onClick={() => {
                  if (item.sub) setOpenSub(s => (s === item.label ? null : item.label))
                  else item.action?.()
                }}
              >
                {item.label}{item.sub ? ' ▾' : ''}
              </button>
              {item.sub && openSub === item.label && (
                <div className="menu-dropdown ribbon-sub">
                  {item.sub.map(sub => (
                    <button key={sub.label} onClick={() => sub.action?.()}>{sub.label}</button>
                  ))}
                </div>
              )}
            </span>
          ))}
        </div>
      )}
      <textarea
        ref={taRef}
        className={'notepad-text' + (glitching ? ' glitch' : '')}
        style={{
          fontSize,
          fontFamily: comicSans ? '"Comic Sans MS", "Comic Sans", cursive' : undefined,
          fontWeight: boldMode ? 'bold' : undefined,
          color: textColor ?? undefined,
        }}
        value={content}
        onChange={onChange}
        onClick={() => { closeMenus(); setHamburgerOpen(false) }}
        readOnly={hackerTyping}
        spellCheck={false}
        placeholder="Type here. What could go wrong?"
      />
      {showSave && (
        <SaveDialog initialName={fileName} onSave={doSave} onCancel={() => setShowSave(false)} />
      )}
      {dialUpTarget && (
        <DialUp
          onDone={onDialUpDone}
          onCancel={() => { setDialUpTarget(null); toast('Save abandoned. The document understands. It has been abandoned before.') }}
        />
      )}
    </div>
  )
}
