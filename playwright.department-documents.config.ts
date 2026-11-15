import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/department-documents', workers: 1,
  outputDir: 'test-results/department-documents', reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5203', headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5203 --strictPort', url: 'http://127.0.0.1:5203',
    reuseExistingServer: false, env: { VITE_DATA_MODE: 'api', VITE_API_BASE_URL: '/api/v1' } },
})
