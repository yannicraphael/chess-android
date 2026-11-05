// Renders the app icon (scripts/icon/icon.html) to all Android and web sizes.
// Run once after changing the icon: node scripts/build-icons.mjs (needs Playwright + Python Pillow).
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const { chromium } = createRequire(import.meta.url)('playwright')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = path.join(root, 'node_modules/.cache/icons')
mkdirSync(tmp, { recursive: true })
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 2200, height: 700 } })
await page.goto('file://' + path.join(root, 'scripts/icon/icon.html'))
await page.waitForTimeout(500)
for (const id of ['full', 'bg', 'fg', 'round']) {
  await page.locator('#' + id).screenshot({ path: path.join(tmp, id + '.png'), omitBackground: true })
}
await browser.close()
execFileSync('python3', [path.join(root, 'scripts/icon/resize.py'), tmp, root], { stdio: 'inherit' })
