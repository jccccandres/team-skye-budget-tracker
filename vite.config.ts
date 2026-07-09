import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// VITE_BASE_PATH is set in CI to /{repo-name}/ for GitHub Pages project sites.
// Locally it defaults to '/' so `npm run dev` works without extra config.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
})
