import { defineConfig } from '@playwright/test'
export default defineConfig({ testDir: './e2e/fe1-preview', use: { baseURL: 'http://127.0.0.1:5181', headless: true }, workers: 1, reporter: [['list'], ['json', { outputFile: 'logs/browser.json' }]] })
