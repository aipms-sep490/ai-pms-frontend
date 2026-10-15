import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite has not loaded .env files into process.env while evaluating this config.
  const configEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const proxyTarget = process.env.VITE_API_PROXY_TARGET?.trim() || configEnv.VITE_API_PROXY_TARGET?.trim() || 'http://localhost:5080'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Windows editors can briefly expose an empty file while replacing its contents.
      watch: { awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } },
      proxy: {
        '/hubs': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
          secure: true,
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    test: {
      exclude: [...configDefaults.exclude, 'e2e/**'],
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
