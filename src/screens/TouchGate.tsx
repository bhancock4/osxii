import { useState } from 'react'

const OVERRIDE_KEY = 'osxii_mouse_sworn'

function hasSworn(): boolean {
  try { return localStorage.getItem(OVERRIDE_KEY) === '1' } catch { return false }
}

/**
 * OSXii needs hover, double-click, and window dragging — none of which exist
 * on touch. Coarse-pointer devices get a system-requirements screen instead of
 * a silently broken game. The override is for iPads with trackpads and liars.
 */
export function needsTouchGate(): boolean {
  return window.matchMedia('(pointer: coarse)').matches && !hasSworn()
}

export default function TouchGate({ onProceed }: { onProceed: () => void }) {
  const [sworn, setSworn] = useState(false)

  const proceed = () => {
    try { localStorage.setItem(OVERRIDE_KEY, '1') } catch { /* fine, they'll swear again */ }
    onProceed()
  }

  return (
    <div className="fullscreen touchgate-screen">
      <div className="select-card window">
        <div className="title-bar">
          <div className="title-bar-text">OSXii Setup — System Requirements Not Met</div>
        </div>
        <div className="window-body touchgate-body">
          <p className="touchgate-icon">🖱️❌📱</p>
          <p>
            OSXii has detected that you are attempting to install a desktop
            operating system on a piece of glass.
          </p>
          <p>
            OSXii requires: a mouse, a keyboard, hover anxiety, and the ability
            to double-click. This is both a system requirement and a lifestyle
            judgment.
          </p>
          <p>Please return on a real computer. The ads will wait. They always wait.</p>
          {!sworn ? (
            <button onClick={() => setSworn(true)}>I have a mouse, I swear</button>
          ) : (
            <div className="touchgate-swear">
              <p>Raise your right hand (the one not holding the phone).</p>
              <button onClick={proceed}>I solemnly swear I am pointing accurately</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
