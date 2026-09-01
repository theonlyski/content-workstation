import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy AI API calls to DashScope to avoid CORS
      '/api/ai': {
        target: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/compatible-mode/v1'),
      },
    },
  },
})
