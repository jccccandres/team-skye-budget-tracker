import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// VITE_BASE_PATH is set in CI to /{repo-name}/ for GitHub Pages project sites.
// Locally it defaults to '/' so `npm run dev` works without extra config.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: "Team Skye's Budget Tracker",
        short_name: 'Budget Tracker',
        description: 'Track personal and shared expenses, income, debts, and savings.',
        // Relative to the manifest's own location, so this resolves
        // correctly whether served from / or a GitHub Pages subpath.
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache only the built app shell (JS/CSS/HTML/icons). Supabase
        // API requests are intentionally left uncached here - this is
        // financial data and it must always be fetched fresh from the
        // network, never served stale from a cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
