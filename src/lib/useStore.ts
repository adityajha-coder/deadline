import { useEffect, useState } from 'react'
import { loadAll, subscribe } from './storage'
import type { DeadlineEvent, Settings } from './types'

export interface StoreState {
  events: DeadlineEvent[]
  settings: Settings
}

/** Live view of events + settings; refreshes whenever storage changes (popup or background). */
export function useStore(): StoreState | null {
  const [state, setState] = useState<StoreState | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      loadAll().then((s) => {
        if (alive) setState(s)
      })
    load()
    const unsubscribe = subscribe(load)
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  return state
}
