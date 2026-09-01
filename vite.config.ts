import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy /api/generate to the serverless function during local dev
      // In production, Vercel handles this automatically
      '/api/generate': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
