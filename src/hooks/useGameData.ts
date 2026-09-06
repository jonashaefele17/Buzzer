import { useSyncExternalStore } from 'react'
import { gameStore } from '../store'
import type { FullGameData } from '../types'

export function useGameData(): FullGameData {
  return useSyncExternalStore(
    (listener) => gameStore.subscribe(listener),
    () => gameStore.getSnapshot(),
  )
}
