import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/access-events', workers: 1, timeout: 30_000,
  outputDir: 'F:/AI-PMS/artifacts/access-events-20261113/browser',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5203', headless: true,
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5203 --strictPort',
    url: 'http://127.0.0.1:5203', reuseExistingServer: true,
    env: { VITE_DATA_MODE: 'api', VITE_API_BASE_URL: '/api/v1' } },
})
