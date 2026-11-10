import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/f1-stage', workers: 1, timeout: 45_000,
  outputDir: 'test-results/f1-stage', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5207', headless: true,
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'pnpm exec vite --host 127.0.0.1 --port 5207 --strictPort', url: 'http://127.0.0.1:5207', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'api', VITE_API_BASE_URL: '/api/v1', VITE_API_PROXY_TARGET: 'http://127.0.0.1:1' } },
})
