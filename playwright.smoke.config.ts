import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/smoke',
  outputDir: 'test-results/smoke/artifacts',
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/smoke-browser.json' }]],
  use: { baseURL: 'http://127.0.0.1:5299', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5299 --strictPort',
    url: 'http://127.0.0.1:5299',
    env: {
      VITE_API_BASE_URL: '/api/v1',
      VITE_DATA_MODE: 'api',
    },
    reuseExistingServer: false,
  },
})
