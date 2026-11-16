import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En-têtes de sécurité : une seule source, vercel.json. « npm run preview » les applique aussi,
// pour vérifier en local que la politique de sécurité (CSP) ne bloque rien avant de déployer.
// upgrade-insecure-requests est retiré en local (le serveur de prévisualisation est en http).
function previewSecurityHeaders() {
  const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
  const all = vercel.headers.find((h) => h.source === '/(.*)').headers
  return Object.fromEntries(
    all
      .filter((h) => h.key !== 'Strict-Transport-Security')
      .map((h) => [h.key, h.value.replace(/;\s*upgrade-insecure-requests/, '')]),
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: { headers: previewSecurityHeaders() },
  build: {
    // F18 : bibliothèques lourdes dans des fichiers séparés, mis en cache indépendamment du code de l'application
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('maplibre-gl')) return 'maplibre'
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'charts'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react'
        },
      },
    },
    // react-globe.gl (three.js, ~1,8 Mo) et MapLibre restent volumineux par nature ;
    // ils sont chargés à part, à la demande (globe : import dynamique ; pages : React.lazy)
    chunkSizeWarningLimit: 1900,
  },
})
