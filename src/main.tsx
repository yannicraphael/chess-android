import './fonts'
import './index.css'
import { lang, loadLanguage, t } from './i18n'

// The dictionary of the chosen language is loaded before the app, because many texts are
// built when their module loads.
async function start() {
  try { await loadLanguage() } catch { /* German fallback */ }
  document.documentElement.lang = lang
  document.title = t('Schach')
  const [{ StrictMode, createElement }, { createRoot }, { default: App }, { preloadSounds }, { recalibrateRating }] = await Promise.all([
    import('react'), import('react-dom/client'), import('./App.tsx'), import('./lib/sound'), import('./lib/recalibrate'),
  ])
  recalibrateRating()
  // audio may only start after a user gesture, so load the sounds on the first touch
  window.addEventListener('pointerdown', () => preloadSounds(), { once: true })
  createRoot(document.getElementById('root')!).render(createElement(StrictMode, null, createElement(App)))
}
void start()
