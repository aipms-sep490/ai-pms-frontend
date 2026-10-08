import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/chat',
  outputDir: 'test-results/chat-fixture/artifacts',
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/chat-browser.json' }]],
  use: { baseURL: 'http://127.0.0.1:5188', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5188 --strictPort',
    url: 'http://127.0.0.1:5188',
    env: { VITE_ENABLE_CHAT: 'true', VITE_DATA_MODE: 'api' },
    reuseExistingServer: false,
  },
})
