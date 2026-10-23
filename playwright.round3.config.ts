import { defineConfig } from '@playwright/test'

const output = process.env.ROUND3_OUTPUT_DIR || 'test-results/round3'
export default defineConfig({
  testDir: './e2e/round3', workers: 1, timeout: 45_000,
  outputDir: `${output}/browser`,
  reporter: [['list'], ['json', { outputFile: `${output}/playwright-controlled.json` }]],
  use: { baseURL: 'http://127.0.0.1:5199', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', actionTimeout: 8_000,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5199 --strictPort', url: 'http://127.0.0.1:5199', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'api', VITE_USE_MOCK_REVIEW_GATES: 'false', VITE_API_BASE_URL: '/api/v1', VITE_API_PROXY_TARGET: 'http://127.0.0.1:1' },
  },
})
