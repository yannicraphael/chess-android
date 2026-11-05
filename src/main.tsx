import './fonts'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { preloadSounds } from './lib/sound'

// audio may only start after a user gesture, so load the sounds on the first touch
window.addEventListener('pointerdown', () => preloadSounds(), { once: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
