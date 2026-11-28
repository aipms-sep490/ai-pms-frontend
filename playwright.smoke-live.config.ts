import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/smoke-9-stages',
  outputDir: 'test-results/smoke-9-stages/artifacts',
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-smoke-live', open: 'never' }],
    ['json', { outputFile: 'test-results/smoke-9-stages-results.json' }],
  ],
  use: {
    baseURL: process.env.SMOKE_LIVE_BASE_URL ?? 'http://127.0.0.1:5230',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.SMOKE_LIVE_SKIP_WEBSERVER === '1' ? undefined : {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5230 --strictPort',
    url: 'http://127.0.0.1:5230',
    env: {
      VITE_API_BASE_URL: process.env.SMOKE_LIVE_API_BASE_URL ?? 'http://127.0.0.1:5088/api/v1',
      VITE_DATA_MODE: 'api',
      VITE_ENABLE_RESULT_CORRECTION: 'true',
      VITE_ENABLE_PEER_EVAL: 'false',
    },
    reuseExistingServer: false,
  },
})
