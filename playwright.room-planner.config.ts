import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/room-planner', workers: 1, timeout: 30_000,
  outputDir: 'test-results/room-planner', reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5207', headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5207 --strictPort',
    url: 'http://127.0.0.1:5207', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'api', VITE_API_BASE_URL: '/api/v1' } },
})
