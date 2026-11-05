import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/f6-prefill', workers: 1, timeout: 45_000,
  outputDir: 'test-results/f6-prefill', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5208', headless: true,
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'pnpm exec vite --host 127.0.0.1 --port 5208 --strictPort', url: 'http://127.0.0.1:5208', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'api', VITE_API_BASE_URL: '/api/v1', VITE_API_PROXY_TARGET: 'http://127.0.0.1:1' } },
})
