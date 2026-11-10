import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/onboarding',
  outputDir: 'test-results/onboarding-fixture/artifacts',
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/onboarding-browser.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5189',
    headless: true,
    trace: 'retain-on-failure',
    // In CI, Playwright's managed Chromium (installed via `playwright install`)
    // is used. In environments that ship a pre-installed browser, point to it
    // with PLAYWRIGHT_CHROMIUM_PATH instead of a version-matched download.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5189 --strictPort',
    url: 'http://127.0.0.1:5189',
    env: { VITE_DATA_MODE: 'api' },
    reuseExistingServer: false,
  },
})
