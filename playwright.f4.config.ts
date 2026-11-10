import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/f4', workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5224', headless: true, launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'pnpm exec vite --host 127.0.0.1 --port 5224 --strictPort', url: 'http://127.0.0.1:5224/e2e/f4-approval.html', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'api', VITE_API_BASE_URL: '/api/v1', VITE_API_PROXY_TARGET: 'http://127.0.0.1:1' } },
})
