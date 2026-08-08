import { useEffect } from 'react'
import { useGame } from './state/game'
import { useWins } from './state/windows'
import { useTimesheet } from './state/timesheet'
import { startChaos } from './chaos/engine'
import { startStrategyLens } from './chaos/slEngine'
import { useState } from 'react'
import BootScreen from './screens/BootScreen'
import SelectScreen from './screens/SelectScreen'
import TouchGate, { needsTouchGate } from './screens/TouchGate'
import VictoryScreen from './screens/VictoryScreen'
import UltimateScreen from './screens/UltimateScreen'
import FrozenScreen from './screens/FrozenScreen'
import SLVictoryScreen from './screens/SLVictoryScreen'
import ShameScreen from './screens/ShameScreen'
import Desktop from './components/Desktop'

export default function App() {
  const status = useGame(s => s.status)
  const [gated, setGated] = useState(needsTouchGate)

  useEffect(() => {
    if (status !== 'playing') return
    if (useGame.getState().module === 'strategylens') {
      startStrategyLens(useTimesheet.getState().playerName)
      useWins.getState().open('claritymail')
    } else {
      useWins.getState().open('readme')
      startChaos()
    }
  }, [status])

  if (gated) return <TouchGate onProceed={() => setGated(false)} />
  if (status === 'boot') return <BootScreen />
  if (status === 'select') return <SelectScreen />
  if (status === 'won') return <VictoryScreen />
  if (status === 'ultrawon') return <UltimateScreen />
  if (status === 'frozen') return <FrozenScreen />
  if (status === 'slwon') return <SLVictoryScreen />
  if (status === 'slshamed') return <ShameScreen />
  return <Desktop />
}
