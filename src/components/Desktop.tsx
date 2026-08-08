import { useState } from 'react'
import { useGame } from '../state/game'
import { useWins, type AppType } from '../state/windows'
import { usePopups } from '../state/popups'
import { SL } from '../chaos/difficulty'
import { chance } from '../chaos/engine'
import { LAUNCH_FAILURES } from '../content/strategylens'
import WindowFrame from './WindowFrame'
import Taskbar from './Taskbar'
import PopupLayer from './PopupLayer'
import Toasts from './Toasts'
import Bindows from './Bindows'
import UpdateOverlay from './UpdateOverlay'
import LockScreen from './LockScreen'
import LagCursor from './LagCursor'
import SystemOverlays from './SystemOverlays'
import SLOverlays from './SLOverlays'
import ChatDock from './ChatDock'

type IconDef = { key: string; glyph: string; label: string; action: AppType | 'recycle' | 'portal' }

const CLASSIC_ICONS: IconDef[] = [
  { key: 'computer', glyph: '🖥️', label: 'My Computer', action: 'explorer' },
  { key: 'readme', glyph: '📖', label: 'READ ME FIRST.txt', action: 'readme' },
  { key: 'notepad', glyph: '📝', label: 'Notepad', action: 'notepad' },
  { key: 'terminal', glyph: '⬛', label: 'Command Prompt', action: 'terminal' },
  { key: 'recycle', glyph: '🗑️', label: 'Recycle Bin', action: 'recycle' },
]

const SL_ICONS: IconDef[] = [
  { key: 'strategylens', glyph: '▽', label: 'StrategyLens® Time Entry', action: 'strategylens' },
  { key: 'claritymail', glyph: '📨', label: 'ClarityMail™', action: 'claritymail' },
  { key: 'portal', glyph: '🛟', label: 'IT Self-Service Portal', action: 'portal' },
  { key: 'recycle', glyph: '🗑️', label: 'Recycle Bin', action: 'recycle' },
]

export default function Desktop() {
  const wins = useWins(s => s.wins)
  const open = useWins(s => s.open)
  const module = useGame(s => s.module)
  const updateOverlay = usePopups(s => s.updateOverlay)
  const degraded = usePopups(s => s.degraded)
  const flickering = usePopups(s => s.flickering)
  const hung = usePopups(s => s.hung)
  const locked = useGame(s => s.locked)
  const [selected, setSelected] = useState<string | null>(null)

  const icons = module === 'strategylens' ? SL_ICONS : CLASSIC_ICONS

  const launch = (action: IconDef['action']) => {
    if (action === 'recycle') {
      usePopups.getState().spawnError({
        title: 'Recycle Bin',
        body: 'The Recycle Bin is a premium feature. Your garbage deserves the cloud.',
        button: 'I guess',
      })
      if (module === 'classic') usePopups.getState().spawnAd('cloudbin')
      return
    }
    if (action === 'portal') {
      usePopups.getState().spawnError({
        title: 'IT Self-Service Portal',
        body: 'The portal is experiencing a portal. Please raise a ticket describing the portal, using the portal.',
        button: 'Raise nothing',
      })
      return
    }
    // Single-instance corporate apps: re-launching focuses the existing window.
    const existing = useWins.getState().wins.find(w => w.app === action)
    if (existing) {
      useWins.getState().focus(existing.id)
      return
    }
    if (action === 'strategylens' && chance(SL.launchFailChance)) {
      usePopups.getState().spawnError(LAUNCH_FAILURES[Math.floor(Math.random() * LAUNCH_FAILURES.length)])
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
        {icons.map(icon => (
          <div
            key={icon.key}
            className={'icon' + (selected === icon.key ? ' selected' : '')}
            onClick={e => {
              e.stopPropagation()
              setSelected(icon.key)
            }}
            onDoubleClick={() => launch(icon.action)}
          >
            <div className={'glyph' + (icon.glyph === '▽' ? ' glyph-sl' : '')}>{icon.glyph}</div>
            <div className="label">{icon.label}</div>
          </div>
        ))}
      </div>

      {wins.map(w => !w.minimized && <WindowFrame key={w.id} win={w} />)}

      <PopupLayer />
      <Bindows />
      <Toasts />
      {updateOverlay && <UpdateOverlay />}
      {module === 'strategylens' && <ChatDock />}
      <Taskbar />
      {degraded && <LagCursor />}
      <SystemOverlays />
      {module === 'strategylens' && <SLOverlays />}
      {locked && <LockScreen />}
    </div>
  )
}
