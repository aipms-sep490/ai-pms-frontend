import { defineConfig } from '@playwright/test'

const evidence = process.env.NOV18_EVIDENCE_DIR || 'test-results/nov18-integrity'
export default defineConfig({
  testDir: './e2e/nov18-integrity', workers: 1, timeout: 45_000,
  outputDir: `${evidence}/browser-artifacts`,
  reporter: [['list'], ['json', { outputFile: `${evidence}/browser-fixture-results.json` }]],
  use: {
    baseURL: 'http://127.0.0.1:5199', headless: true, trace: 'retain-on-failure',
    launchOptions: process.env.NOV18_BROWSER_PATH ? { executablePath: process.env.NOV18_BROWSER_PATH } : {},
  },
  webServer: {
    command: 'npm exec -- vite --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'api', VITE_API_BASE_URL: '/api/v1' },
  },
})
