import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy API calls to the Express backend during local dev
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  },
})
