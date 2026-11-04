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
    env: {
      VITE_DATA_MODE: 'api',
      VITE_USE_MOCK_REVIEW_GATES: 'false',
      VITE_API_BASE_URL: '/api/v1',
      VITE_API_PROXY_TARGET: process.env.REVIEW_GATES_API_URL || 'http://127.0.0.1:5098',
      VITE_ENABLE_CHAT: 'true',
      VITE_ENABLE_CHAT_ATTACHMENTS: 'true',
      VITE_ENABLE_WORKING_AGREEMENT: 'true',
      VITE_ENABLE_PEER_EVAL: 'true',
      VITE_ENABLE_WEEKLY_ASSESSMENT: 'true',
      VITE_ENABLE_COLD_REPORT: 'true',
      VITE_ENABLE_DEFENSE: 'true',
      VITE_ENABLE_RESULT_CORRECTION: 'true',
      VITE_ENABLE_MEETING_COLLABORATION: 'true',
      VITE_ENABLE_INDUSTRY: 'true',
      VITE_ENABLE_AI_ACADEMIC_ASSISTANT: 'true',
      VITE_ENABLE_AI_ADVISORY: 'true',
      VITE_ENABLE_UNIFIED_CAPABILITIES: 'true',
      VITE_ENABLE_JIRA_SPRINT: 'true',
      VITE_ENABLE_GATES: 'true',
    },
  },
})
