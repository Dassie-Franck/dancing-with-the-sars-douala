import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
