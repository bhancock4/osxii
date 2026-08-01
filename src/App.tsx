import { useEffect } from 'react'
import { useGame } from './state/game'
import { useWins } from './state/windows'
import { startChaos } from './chaos/engine'
import BootScreen from './screens/BootScreen'
import SelectScreen from './screens/SelectScreen'
import VictoryScreen from './screens/VictoryScreen'
import UltimateScreen from './screens/UltimateScreen'
import FrozenScreen from './screens/FrozenScreen'
import Desktop from './components/Desktop'

export default function App() {
  const status = useGame(s => s.status)

  useEffect(() => {
    if (status === 'playing') {
      useWins.getState().open('readme')
      startChaos()
    }
  }, [status])

  if (status === 'boot') return <BootScreen />
  if (status === 'select') return <SelectScreen />
  if (status === 'won') return <VictoryScreen />
  if (status === 'ultrawon') return <UltimateScreen />
  if (status === 'frozen') return <FrozenScreen />
  return <Desktop />
}
