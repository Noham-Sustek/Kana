import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Chemins relatifs : l'app fonctionne quel que soit le sous-chemin de déploiement.
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kana — hiragana & katakana',
        short_name: 'Kana',
        description: 'Apprendre les hiragana et katakana, 100 % hors ligne.',
        id: './',
        lang: 'fr',
        categories: ['education'],
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        // Générées par `npm run icons` (scripts/build-icons.mjs). Le 512 sert aussi
        // à l'écran de démarrage Android (avec name et background_color).
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      // Tout le build est précaché à l'installation et servi depuis le cache
      // (cache-first) : l'app fonctionne intégralement en mode avion.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,mp3,ogg,json,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Filet de sécurité pour un fichier du même site absent du précache.
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin }) => sameOrigin,
            handler: 'CacheFirst',
            options: { cacheName: 'kana-runtime', expiration: { maxEntries: 50 } },
          },
        ],
      },
    }),
  ],
})
