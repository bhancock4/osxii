import { useEffect, useRef } from 'react'

/**
 * Enhanced Cursor Physics™: the real cursor is hidden (see .degraded CSS) and
 * this replacement trails behind the pointer with tremendous reluctance.
 */
export default function LagCursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let x = tx
    let y = ty
    let raf = 0
    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
    }
    const loop = () => {
      x += (tx - x) * 0.06
      y += (ty - y) * 0.06
      if (ref.current) ref.current.style.transform = `translate(${x}px, ${y}px)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="lag-cursor" ref={ref}>
      <svg width="18" height="24" viewBox="0 0 18 24">
        <path d="M1 1 L1 18 L5.5 14.5 L8.5 21.5 L11.5 20 L8.5 13.5 L14 13 Z" fill="#fff" stroke="#000" strokeWidth="1.4" />
      </svg>
    </div>
  )
}
