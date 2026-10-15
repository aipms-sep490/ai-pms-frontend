import { configDefaults, defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || 'https://api-staging.khaidz.com'

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
