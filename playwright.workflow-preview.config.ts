import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e/workflow-preview', workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/workflow-preview/e2e.json' }]],
  use: { baseURL: 'http://127.0.0.1:5193', headless: true, trace: 'retain-on-failure', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'pnpm exec vite --host 127.0.0.1 --port 5193 --strictPort', url: 'http://127.0.0.1:5193', env: { VITE_DATA_MODE: 'mock', VITE_ENABLE_WORKFLOW_PREVIEW: 'true' }, reuseExistingServer: false },
})
