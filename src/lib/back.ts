import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

// Android back button: open sub-screens register a handler; the newest one runs first.
// A handler returns false when it has nothing to close, then the next one is asked.

type Handler = () => boolean | void
const stack: { current: Handler }[] = []

export function useBack(handler: Handler, active = true) {
  const ref = useRef(handler)
  useEffect(() => { ref.current = handler })
  useEffect(() => {
    if (!active) return
    const entry = { get current() { return ref.current } }
    stack.push(entry)
    return () => {
      const i = stack.lastIndexOf(entry)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [active])
}

export function handleBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].current() !== false) return true
  return false
}

// called once by the app; `fallback` handles the main screens (e.g. go to the home tab)
export function listenBackButton(fallback: () => boolean) {
  if (!Capacitor.isNativePlatform()) return () => {}
  const sub = App.addListener('backButton', () => {
    if (handleBack()) return
    if (fallback()) return
    void App.minimizeApp()
  })
  return () => { void sub.then((s) => s.remove()) }
}
