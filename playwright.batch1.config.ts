import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e/batch1', workers: 1, timeout: 60_000,
  outputDir: `${process.env.BATCH1_EVIDENCE_DIR || 'test-results/batch1'}/browser`,
  reporter: [['list'], ['json', { outputFile: process.env.BATCH1_E2E_REPORT || 'test-results/batch1/playwright.json' }]],
  use: { baseURL: 'http://127.0.0.1:5198', headless: true, trace: 'off', actionTimeout: 12_000, launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5198 --strictPort', url: 'http://127.0.0.1:5198', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'api', VITE_USE_MOCK_REVIEW_GATES: 'false', VITE_API_BASE_URL: '/api/v1', VITE_API_PROXY_TARGET: 'https://api-staging.khaidz.com' },
  },
})
