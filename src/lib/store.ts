import { useSyncExternalStore } from 'react'

// Minimal persisted store: state lives in memory and localStorage.
export function createStore<T extends object>(key: string, defaults: T) {
  let state: T = defaults
  try {
    const raw = localStorage.getItem(key)
    if (raw) state = { ...defaults, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  const listeners = new Set<() => void>()

  return {
    get: () => state,
    set(patch: Partial<T> | ((s: T) => Partial<T>)) {
      const p = typeof patch === 'function' ? patch(state) : patch
      state = { ...state, ...p }
      try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* ignore */ }
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => { listeners.delete(l) }
    },
    use(): T {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSyncExternalStore(this.subscribe, this.get)
    },
  }
}
