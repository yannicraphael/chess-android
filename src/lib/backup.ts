import { t } from '../i18n'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

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
  return `${t('schach-sicherung')}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
}

// returns an error text, or null when the backup was restored (the app then reloads)
export function restoreBackup(text: string): string | null {
  let b: Backup
  try { b = JSON.parse(text.trim()) } catch { return t('Das ist keine gültige Sicherung.') }
  if (!b || b.app !== 'schach' || typeof b.data !== 'object') return t('Das ist keine Sicherung dieser App.')
  try {
    localStorage.clear()
    for (const [k, v] of Object.entries(b.data)) localStorage.setItem(k, v)
  } catch {
    return t('Die Sicherung konnte nicht gespeichert werden.')
  }
  window.location.reload()
  return null
}

export async function shareOrDownload(text: string) {
  const name = backupFileName()
  if (Capacitor.isNativePlatform()) {
    // Android app: write the file and open the share menu (Drive, mail, files, ...)
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: t('Schach-Sicherung'), files: [uri], dialogTitle: t('Sicherung speichern') })
    return 'shared'
  }
  // browser: a normal download into the downloads folder
  const file = new File([text], name, { type: 'application/json' })
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
