import { useState } from 'react'
import { useGame } from '../state/game'
import { useWins } from '../state/windows'
import { usePopups } from '../state/popups'
import WindowFrame from './WindowFrame'
import Taskbar from './Taskbar'
import PopupLayer from './PopupLayer'
import Toasts from './Toasts'
import Bindows from './Bindows'
import UpdateOverlay from './UpdateOverlay'
import LockScreen from './LockScreen'
import LagCursor from './LagCursor'
import SystemOverlays from './SystemOverlays'

const ICONS: { key: string; glyph: string; label: string; action: 'explorer' | 'notepad' | 'terminal' | 'readme' | 'recycle' }[] = [
  { key: 'computer', glyph: '🖥️', label: 'My Computer', action: 'explorer' },
  { key: 'readme', glyph: '📖', label: 'READ ME FIRST.txt', action: 'readme' },
  { key: 'notepad', glyph: '📝', label: 'Notepad', action: 'notepad' },
  { key: 'terminal', glyph: '⬛', label: 'Command Prompt', action: 'terminal' },
  { key: 'recycle', glyph: '🗑️', label: 'Recycle Bin', action: 'recycle' },
]

export default function Desktop() {
  const wins = useWins(s => s.wins)
  const open = useWins(s => s.open)
  const updateOverlay = usePopups(s => s.updateOverlay)
  const degraded = usePopups(s => s.degraded)
  const flickering = usePopups(s => s.flickering)
  const hung = usePopups(s => s.hung)
  const locked = useGame(s => s.locked)
  const [selected, setSelected] = useState<string | null>(null)

  const launch = (action: (typeof ICONS)[number]['action']) => {
    if (action === 'recycle') {
      usePopups.getState().spawnError({
        title: 'Recycle Bin',
        body: 'The Recycle Bin is a premium feature. Your garbage deserves the cloud.',
        button: 'I guess',
      })
      usePopups.getState().spawnAd('cloudbin')
      return
    }
    open(action)
  }

  return (
    <div
      className={'desktop' + (degraded ? ' degraded' : '') + (flickering ? ' flickering' : '') + (hung ? ' hung' : '')}
      onClick={() => setSelected(null)}
    >
      <div className="icons">
        {ICONS.map(icon => (
          <div
            key={icon.key}
            className={'icon' + (selected === icon.key ? ' selected' : '')}
            onClick={e => {
              e.stopPropagation()
              setSelected(icon.key)
            }}
            onDoubleClick={() => launch(icon.action)}
          >
            <div className="glyph">{icon.glyph}</div>
            <div className="label">{icon.label}</div>
          </div>
        ))}
      </div>

      {wins.map(w => !w.minimized && <WindowFrame key={w.id} win={w} />)}

      <PopupLayer />
      <Bindows />
      <Toasts />
      {updateOverlay && <UpdateOverlay />}
      <Taskbar />
      {degraded && <LagCursor />}
      <SystemOverlays />
      {locked && <LockScreen />}
    </div>
  )
}
