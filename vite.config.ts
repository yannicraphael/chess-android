import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' makes the build work both on GitHub Pages (sub-folder) and inside the Android app
export default defineConfig({
  base: './',
  plugins: [react()],
})
