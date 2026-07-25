import { useEffect, useState } from 'react'

export default function UpdateOverlay() {
  const [pct, setPct] = useState(7)
  useEffect(() => {
    const id = setInterval(() => {
      setPct(p => (p >= 99 ? 12 : p + Math.floor(Math.random() * 30)))
    }, 700)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="fullscreen update-screen">
      <div>
        <div className="update-spinner">⟳</div>
        <p>Working on updates: 1 of 3</p>
        <p>{Math.min(pct, 99)}% complete</p>
        <p className="update-small">Do not turn off your imagination.</p>
      </div>
    </div>
  )
}
