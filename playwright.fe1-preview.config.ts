import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e/fe1-preview',
  use: { baseURL: 'http://127.0.0.1:5181', headless: true },
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'logs/browser.json' }]],
  webServer: { command: 'pnpm dev --host 127.0.0.1 --port 5181 --strictPort', url: 'http://127.0.0.1:5181/e2e/fe1-preview.html', timeout: 30_000, reuseExistingServer: !process.env.CI },
})
