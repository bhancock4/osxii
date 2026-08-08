import { useMemo } from 'react'
import { useWins, type Win } from '../state/windows'
import Notepad from '../apps/Notepad'
import Explorer from '../apps/Explorer'
import Terminal from '../apps/Terminal'
import ReadmeViewer from '../apps/ReadmeViewer'
import ClarityMail from '../apps/ClarityMail'
import StrategyLens from '../apps/StrategyLens'

export default function WindowFrame({ win }: { win: Win }) {
  const focus = useWins(s => s.focus)
  const close = useWins(s => s.close)
  const minimize = useWins(s => s.minimize)
  const move = useWins(s => s.move)
  const topZ = useWins(s => Math.max(0, ...s.wins.filter(w => !w.minimized).map(w => w.z)))
  const isActive = win.z === topZ

  const body = useMemo(() => {
    switch (win.app) {
      case 'notepad': return <Notepad winId={win.id} props={win.props} />
      case 'explorer': return <Explorer winId={win.id} />
      case 'terminal': return <Terminal winId={win.id} />
      case 'readme': return <ReadmeViewer />
      case 'claritymail': return <ClarityMail />
      case 'strategylens': return <StrategyLens />
    }
  }, [win.app, win.id, win.props])

  const onTitleDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    const offX = e.clientX - win.x
    const offY = e.clientY - win.y
    const onMove = (ev: PointerEvent) => {
      const x = Math.max(-win.w + 80, Math.min(ev.clientX - offX, window.innerWidth - 60))
      const y = Math.max(0, Math.min(ev.clientY - offY, window.innerHeight - 60))
      move(win.id, x, y)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className="window win"
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      onPointerDown={() => focus(win.id)}
    >
      <div className={'title-bar' + (isActive ? '' : ' inactive')} onPointerDown={onTitleDown}>
        <div className="title-bar-text">{win.title}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={() => minimize(win.id)} />
          <button aria-label="Close" onClick={() => close(win.id)} />
        </div>
      </div>
      <div className="window-body app-body">{body}</div>
    </div>
  )
}
