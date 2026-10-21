import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/review-gates', workers: 1,
  outputDir: process.env.REVIEW_GATES_OUTPUT_DIR || 'test-results/review-gates',
  reporter: [['list'], ['json', { outputFile: process.env.REVIEW_GATES_E2E_REPORT || 'test-results/review-gates/e2e.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5197', headless: true,
    // Real acceptance logins carry private credentials; retain only sanitized assertions/screenshots.
    trace: 'off',
    actionTimeout: 15_000,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5197 --strictPort', url: 'http://127.0.0.1:5197', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'api', VITE_USE_MOCK_REVIEW_GATES: 'false', VITE_API_BASE_URL: '/api/v1', VITE_API_PROXY_TARGET: process.env.REVIEW_GATES_API_URL || 'http://127.0.0.1:5098' },
  },
})
