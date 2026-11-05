// Backup of everything the app stores on this device (progress, rating, games, settings),
// so it can be moved to a new phone or survive a reinstall.

interface Backup { app: 'schach'; version: 1; date: string; data: Record<string, string> }

export function makeBackup(): string {
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k) data[k] = localStorage.getItem(k) ?? ''
  }
  const b: Backup = { app: 'schach', version: 1, date: new Date().toISOString(), data }
  return JSON.stringify(b)
}

export function backupFileName() {
  const d = new Date()
  return `schach-sicherung-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
}

// returns an error text, or null when the backup was restored (the app then reloads)
export function restoreBackup(text: string): string | null {
  let b: Backup
  try { b = JSON.parse(text.trim()) } catch { return 'Das ist keine gültige Sicherung.' }
  if (!b || b.app !== 'schach' || typeof b.data !== 'object') return 'Das ist keine Sicherung dieser App.'
  try {
    localStorage.clear()
    for (const [k, v] of Object.entries(b.data)) localStorage.setItem(k, v)
  } catch {
    return 'Die Sicherung konnte nicht gespeichert werden.'
  }
  window.location.reload()
  return null
}

export async function shareOrDownload(text: string) {
  const name = backupFileName()
  const file = new File([text], name, { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Schach-Sicherung' }); return 'shared' } catch { /* cancelled or not possible */ }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}
