import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // './' gör att appen fungerar under en undersökväg på GitHub Pages
  base: './',
  // Gör att MAPBOX_API_KEY (utan VITE_-prefix) når webbläsaren
  envPrefix: ['VITE_', 'MAPBOX_'],
  server: { port: 5173, strictPort: true },
})
