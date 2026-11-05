import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/f10-tour', workers: 1, timeout: 45_000,
  outputDir: 'test-results/f10-tour', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5210', headless: true,
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'pnpm exec vite --host 127.0.0.1 --port 5210 --strictPort', url: 'http://127.0.0.1:5210', reuseExistingServer: false },
})
